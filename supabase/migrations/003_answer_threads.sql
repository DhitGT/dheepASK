-- Run after 002_short_codes.sql. Existing answers remain top-level answers.
begin;
alter table public.answers add column parent_id uuid;
alter table public.answers add constraint answers_id_question_unique unique (id, question_id);
-- The composite foreign key prevents replying to an answer from another question.
alter table public.answers add constraint answers_parent_question_fk
  foreign key (parent_id, question_id) references public.answers(id, question_id) on delete cascade;
alter table public.answers add constraint answers_not_own_parent check (parent_id is distinct from id);
create index answers_parent_idx on public.answers(parent_id, created_at);
grant select (parent_id) on public.answers to anon, authenticated;
grant insert (parent_id) on public.answers to authenticated;
notify pgrst, 'reload schema';
commit;
