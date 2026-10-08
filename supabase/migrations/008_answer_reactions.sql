begin;
create table public.answer_reactions (
  answer_id uuid not null references public.answers(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','laugh','fire','clap','wow','love')),
  primary key (answer_id,author_id)
);
alter table public.answer_reactions enable row level security;
revoke all on public.answer_reactions from public, anon, authenticated;

-- Return counts and the caller's choice only; never expose other sessions.
create function public.get_answer_reactions(question uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(a.id, jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(t.reaction,t.total),'{}'::jsonb)
      from (select r.reaction,count(*)::integer as total from public.answer_reactions r
        where r.answer_id = a.id group by r.reaction) t),
    'mine', (select r.reaction from public.answer_reactions r where r.answer_id = a.id and r.author_id = auth.uid())
  )), '{}'::jsonb)
  from public.answers a join public.questions q on q.id = a.question_id
  where q.id = question and (q.room_id is null or public.is_room_member(q.room_id));
$$;
create function public.set_answer_reaction(target uuid, reaction text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare question uuid; scope uuid; who uuid := auth.uid();
begin
  if who is null then raise exception 'Session required'; end if;
  if reaction is not null and reaction not in ('heart','laugh','fire','clap','wow','love') then
    raise exception 'Invalid reaction';
  end if;
  select q.id,q.room_id into question,scope from public.answers a
    join public.questions q on q.id = a.question_id where a.id = target;
  if not found or (scope is not null and not public.is_room_member(scope)) then
    raise exception 'Answer not available';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text || who::text, 0));
  delete from public.answer_reactions r where r.answer_id = target and r.author_id = who;
  if reaction is not null then
    insert into public.answer_reactions(answer_id,author_id,reaction) values(target,who,reaction);
  end if;
  return public.get_answer_reactions(question) -> target::text;
end;
$$;
-- Metadata invalidation preserves private room access for realtime updates.
create function public.notify_answer_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare question uuid; scope uuid; target uuid;
begin
  if tg_op = 'DELETE' then target := old.answer_id; else target := new.answer_id; end if;
  select q.id,q.room_id into question,scope from public.answers a
    join public.questions q on q.id = a.question_id where a.id = target;
  if found then perform public.invalidate_question(question,scope); end if;
  return null;
end;
$$;
create trigger answer_reactions_realtime after insert or update or delete on public.answer_reactions
  for each row execute function public.notify_answer_reaction();
revoke all on function public.notify_answer_reaction() from public, anon, authenticated;
revoke all on function public.get_answer_reactions(uuid), public.set_answer_reaction(uuid,text) from public;
grant execute on function public.get_answer_reactions(uuid) to anon, authenticated;
grant execute on function public.set_answer_reaction(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;
