-- Run after 001_initial.sql. UUIDs and existing question/answer data stay intact.
begin;
alter table public.questions add column short_code text;
alter table public.questions add constraint questions_short_code_format check (short_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$');
alter table public.questions add constraint questions_short_code_unique unique (short_code);
create function public.next_question_code() returns text
language plpgsql security definer set search_path = '' as $$
declare candidate text; alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ';
begin
  -- Serialize allocation across sessions; UNIQUE is the final collision guard.
  perform pg_advisory_xact_lock(701923845);
  for attempt in 1..1000 loop
    candidate := '';
    for position in 1..5 loop
      candidate := candidate || substr(alphabet, floor(random() * 23)::integer + 1, 1);
    end loop;
    if not exists (select 1 from public.questions where short_code = candidate) then return candidate; end if;
  end loop;
  -- A free-slot fallback also works when the namespace is nearly full.
  select c.code into candidate from generate_series(0, 6436342) n
  cross join lateral (select
    substr(alphabet, n / 279841 % 23 + 1, 1) ||
    substr(alphabet, n / 12167 % 23 + 1, 1) ||
    substr(alphabet, n / 529 % 23 + 1, 1) ||
    substr(alphabet, n / 23 % 23 + 1, 1) ||
    substr(alphabet, n % 23 + 1, 1) as code) c
  where not exists (select 1 from public.questions where short_code = c.code) limit 1;
  if candidate is null then raise exception 'All five-letter question codes have been used.'; end if;
  return candidate;
end;
$$;
revoke all on function public.next_question_code() from public, anon, authenticated;
do $$
declare question_record record;
begin
  for question_record in select id from public.questions where short_code is null loop
    update public.questions set short_code = public.next_question_code() where id = question_record.id;
  end loop;
end;
$$;
alter table public.questions alter column short_code set not null;
create function public.assign_question_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.short_code := public.next_question_code();
  return new;
end;
$$;
revoke all on function public.assign_question_code() from public, anon, authenticated;
create trigger questions_short_code before insert on public.questions
for each row execute function public.assign_question_code();
grant select (short_code) on public.questions to anon, authenticated;
-- Append the column to preserve the existing view column order.
create or replace view public.question_feed with (security_invoker = true) as
select q.id, q.title, q.body, q.category, q.created_at,
  (select count(a.id)::integer from public.answers a where a.question_id = q.id) as answer_count,
  q.short_code
from public.questions q;
grant select on public.question_feed to anon, authenticated;
notify pgrst, 'reload schema';
commit;
