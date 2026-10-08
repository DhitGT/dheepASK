-- Run after 003_answer_threads.sql.
begin;
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  context text not null check (char_length(btrim(context)) between 2 and 2000),
  created_at timestamptz not null default now()
);
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  primary key (room_id, author_id)
);
create table public.anonymous_names (
  scope_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  alias text not null default ('anon-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  primary key (scope_id, author_id), unique (scope_id, alias)
);
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.anonymous_names enable row level security;
revoke all on public.rooms, public.room_members, public.anonymous_names from public, anon, authenticated;
alter table public.questions add column room_id uuid references public.rooms(id) on delete cascade;
alter table public.questions add column anon_name text;
alter table public.answers add column anon_name text;
create index questions_room_idx on public.questions(room_id, created_at desc);

create function public.is_room_member(room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members m where m.room_id = room and m.author_id = auth.uid());
$$;
revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to anon, authenticated;

create function public.anonymous_alias(scope uuid, author uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  insert into public.anonymous_names(scope_id,author_id) values (scope,author)
    on conflict (scope_id,author_id) do nothing;
  select alias into result from public.anonymous_names where scope_id = scope and author_id = author;
  return result;
end;
$$;
revoke all on function public.anonymous_alias(uuid,uuid) from public, anon, authenticated;

create function public.assign_anonymous_name() returns trigger
language plpgsql security definer set search_path = '' as $$
declare scope uuid;
begin
  if tg_table_name = 'questions' then scope := coalesce(new.room_id,new.id);
  else select coalesce(q.room_id,q.id) into scope from public.questions q where q.id = new.question_id;
  end if;
  if scope is null then raise exception 'Question not found'; end if;
  new.anon_name := public.anonymous_alias(scope,new.author_id);
  return new;
end;
$$;
revoke all on function public.assign_anonymous_name() from public, anon, authenticated;
create trigger questions_anonymous_name before insert on public.questions for each row execute function public.assign_anonymous_name();
create trigger answers_anonymous_name before insert on public.answers for each row execute function public.assign_anonymous_name();
update public.questions set anon_name = public.anonymous_alias(id,author_id);
update public.answers a set anon_name = public.anonymous_alias(a.question_id,a.author_id);
alter table public.questions alter column anon_name set not null;
alter table public.answers alter column anon_name set not null;
grant select (room_id,anon_name) on public.questions to anon, authenticated;
grant select (anon_name) on public.answers to anon, authenticated;
grant insert (room_id) on public.questions to authenticated;

drop policy questions_read on public.questions;
create policy questions_read on public.questions for select to anon, authenticated
  using (room_id is null or public.is_room_member(room_id));
drop policy questions_create on public.questions;
create policy questions_create on public.questions for insert to authenticated
  with check (author_id = (select auth.uid()) and (room_id is null or public.is_room_member(room_id)));
drop policy answers_read on public.answers;
create policy answers_read on public.answers for select to anon, authenticated
  using (exists (select 1 from public.questions q where q.id = question_id));
drop policy answers_create on public.answers;
create policy answers_create on public.answers for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.questions q where q.id = question_id));

create or replace view public.question_feed with (security_invoker = true) as
select q.id,q.title,q.body,q.category,q.created_at,
  (select count(a.id)::integer from public.answers a where a.question_id = q.id) as answer_count,
  q.short_code,q.room_id,q.anon_name
from public.questions q where q.room_id is null;
create view public.room_question_feed with (security_invoker = true) as
select q.id,q.title,q.body,q.category,q.created_at,
  (select count(a.id)::integer from public.answers a where a.question_id = q.id) as answer_count,
  q.short_code,q.room_id,q.anon_name
from public.questions q where q.room_id is not null;
revoke all on public.room_question_feed from public, anon, authenticated;
grant select on public.room_question_feed to authenticated;

create function public.join_room(link_token uuid) returns table
  (id uuid,title text,context text,token uuid,created_at timestamptz,my_alias text,is_owner boolean)
language plpgsql security definer set search_path = '' as $$
declare room_record public.rooms; who uuid := auth.uid();
begin
  if who is null then raise exception 'Session required'; end if;
  select * into room_record from public.rooms r where r.token = link_token;
  if not found then return; end if;
  insert into public.room_members(room_id,author_id) values (room_record.id,who) on conflict do nothing;
  return query select room_record.id,room_record.title,room_record.context,room_record.token,room_record.created_at,
    public.anonymous_alias(room_record.id,who),room_record.author_id = who;
end;
$$;
-- No room listing API; possession of the unguessable link grants entry.
create function public.create_room(room_title text,room_context text) returns table
  (id uuid,title text,context text,token uuid,created_at timestamptz,my_alias text,is_owner boolean)
language plpgsql security definer set search_path = '' as $$
declare created public.rooms; who uuid := auth.uid();
begin
  if who is null then raise exception 'Session required'; end if;
  insert into public.rooms(author_id,title,context) values (who,btrim(room_title),btrim(room_context)) returning * into created;
  return query select * from public.join_room(created.token);
end;
$$;
revoke all on function public.join_room(uuid), public.create_room(text,text) from public, anon;
grant execute on function public.join_room(uuid), public.create_room(text,text) to authenticated;

create or replace function public.enforce_post_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));
  if exists (select 1 from public.questions where author_id = new.author_id and created_at > now() - interval '30 seconds')
    or exists (select 1 from public.answers where author_id = new.author_id and created_at > now() - interval '30 seconds')
    or exists (select 1 from public.rooms where author_id = new.author_id and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds before posting again.' using errcode = 'P0001';
  end if;
  new.created_at := now(); return new;
end;
$$;
create trigger rooms_cooldown before insert on public.rooms for each row execute function public.enforce_post_cooldown();
notify pgrst, 'reload schema';
commit;
