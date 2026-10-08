-- Publish metadata only: never replicate authors, room links or private content.
begin;
create table public.realtime_updates (
  topic text primary key,
  room_id uuid,
  revision bigint not null default 1
);
alter table public.realtime_updates enable row level security;
revoke all on public.realtime_updates from public, anon, authenticated;
grant select on public.realtime_updates to anon, authenticated;
create policy updates_read on public.realtime_updates for select to anon, authenticated
  using (room_id is null or public.is_room_member(room_id));

create function public.bump_realtime_topic(topic_name text, scope uuid default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.realtime_updates(topic,room_id) values(topic_name,scope)
  on conflict (topic) do update set revision = public.realtime_updates.revision + 1, room_id = excluded.room_id;
$$;
revoke all on function public.bump_realtime_topic(text,uuid) from public, anon, authenticated;

create function public.invalidate_question(question uuid, scope uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.bump_realtime_topic(case when scope is null then 'feed' else 'room:' || scope::text end, scope);
  perform public.bump_realtime_topic('question:' || question::text, scope);
end;
$$;
revoke all on function public.invalidate_question(uuid,uuid) from public, anon, authenticated;

create function public.notify_realtime_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare question uuid; scope uuid;
begin
  if tg_table_name = 'site_counters' then
    perform public.bump_realtime_topic('site');
  elsif tg_table_name = 'rooms' then
    if tg_op = 'DELETE' then scope := old.id; else scope := new.id; end if;
    perform public.bump_realtime_topic('room:' || scope::text, scope);
  elsif tg_table_name = 'questions' then
    if tg_op <> 'INSERT' then perform public.invalidate_question(old.id, old.room_id); end if;
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.room_id is distinct from old.room_id) then
      perform public.invalidate_question(new.id, new.room_id);
    end if;
  else
    if tg_op <> 'INSERT' then
      select q.id,q.room_id into question,scope from public.questions q where q.id = old.question_id;
      if found then perform public.invalidate_question(question,scope); end if;
    end if;
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.question_id is distinct from old.question_id) then
      select q.id,q.room_id into question,scope from public.questions q where q.id = new.question_id;
      if found then perform public.invalidate_question(question,scope); end if;
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.notify_realtime_update() from public, anon, authenticated;
create trigger questions_realtime after insert or update or delete on public.questions for each row execute function public.notify_realtime_update();
create trigger answers_realtime after insert or update or delete on public.answers for each row execute function public.notify_realtime_update();
create trigger rooms_realtime after update or delete on public.rooms for each row execute function public.notify_realtime_update();
create trigger site_realtime after insert or update or delete on public.site_counters for each row execute function public.notify_realtime_update();

insert into public.realtime_updates(topic) values ('feed'),('site');
-- Keep tombstones so DELETE notifications never bypass the room's SELECT policy.
-- Existing topics reconcile on subscription; no backfill of sensitive content.
do $$
declare raw_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables) then
    raise exception 'supabase_realtime must publish explicit tables, not ALL TABLES, to protect private data';
  end if;
  foreach raw_table in array array['questions','answers','rooms','room_members','anonymous_names','site_counters'] loop
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = raw_table) then
      execute format('alter publication supabase_realtime drop table public.%I', raw_table);
    end if;
  end loop;
  alter publication supabase_realtime add table public.realtime_updates;
end;
$$;
notify pgrst, 'reload schema';
commit;
