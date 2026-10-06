-- Run once in the Supabase SQL editor. Enable Authentication > Anonymous Sign-ins.
begin;
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 10 and 180),
  body text not null default '' check (char_length(body) <= 2000),
  category text not null check (category in ('Kehidupan','Hubungan','Karier','Pendidikan','Teknologi','Random')),
  created_at timestamptz not null default now()
);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 2 and 3000),
  created_at timestamptz not null default now()
);
create index questions_created_idx on public.questions(created_at desc);
create index questions_author_idx on public.questions(author_id, created_at desc);
create index answers_question_idx on public.answers(question_id, created_at);
create index answers_author_idx on public.answers(author_id, created_at desc);
alter table public.questions enable row level security;
alter table public.answers enable row level security;
create policy questions_read on public.questions for select to anon, authenticated using (true);
create policy answers_read on public.answers for select to anon, authenticated using (true);
create policy questions_create on public.questions for insert to authenticated with check (author_id = (select auth.uid()));
create policy answers_create on public.answers for insert to authenticated with check (author_id = (select auth.uid()));
-- Column grants keep author UUIDs private, even through the public REST API.
revoke all on public.questions, public.answers from anon, authenticated;
grant select (id,title,body,category,created_at) on public.questions to anon, authenticated;
grant select (id,question_id,body,created_at) on public.answers to anon, authenticated;
grant insert (title,body,category,author_id) on public.questions to authenticated;
grant insert (question_id,body,author_id) on public.answers to authenticated;
create view public.question_feed with (security_invoker = true) as
select q.id, q.title, q.body, q.category, q.created_at,
  (select count(a.id)::integer from public.answers a where a.question_id = q.id) as answer_count
from public.questions q;
grant select on public.question_feed to anon, authenticated;
-- Database-backed cooldown works across Vercel serverless instances.
create function public.enforce_post_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));
  if exists (select 1 from public.questions where author_id = new.author_id and created_at > now() - interval '30 seconds')
     or exists (select 1 from public.answers where author_id = new.author_id and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds before posting again.' using errcode = 'P0001';
  end if;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.enforce_post_cooldown() from public, anon, authenticated;
create trigger questions_cooldown before insert on public.questions for each row execute function public.enforce_post_cooldown();
create trigger answers_cooldown before insert on public.answers for each row execute function public.enforce_post_cooldown();
commit;
