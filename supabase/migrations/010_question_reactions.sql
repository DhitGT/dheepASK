-- Run after 009_discord_reactions.sql. Reuse the existing emoji catalog.
begin;
create table public.question_reactions (
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null references public.reaction_emojis(emoji),
  primary key (question_id,author_id,reaction)
);
alter table public.question_reactions enable row level security;
revoke all on public.question_reactions from public, anon, authenticated;

-- Feed reads fetch reaction counts in a batch, including only the caller's choices.
create function public.get_question_reactions(question_ids uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(q.id, jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(t.reaction,t.total),'{}'::jsonb)
      from (select r.reaction,count(*)::integer as total from public.question_reactions r
        where r.question_id = q.id group by r.reaction) t),
    'mine', (select coalesce(jsonb_agg(r.reaction order by r.reaction),'[]'::jsonb)
      from public.question_reactions r where r.question_id = q.id and r.author_id = auth.uid())
  )), '{}'::jsonb)
  from public.questions q where q.id = any(question_ids)
    and (q.room_id is null or public.is_room_member(q.room_id));
$$;
create function public.set_question_emoji_reaction(target uuid, emoji text, selected boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare scope uuid; who uuid := auth.uid();
begin
  if who is null then raise exception 'Session required'; end if;
  if emoji is null or selected is null or not exists (select 1 from public.reaction_emojis e where e.emoji = $2) then
    raise exception 'Invalid emoji reaction';
  end if;
  select q.room_id into scope from public.questions q where q.id = target;
  if not found or (scope is not null and not public.is_room_member(scope)) then
    raise exception 'Question not available';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text || who::text, 0));
  if selected then
    insert into public.question_reactions(question_id,author_id,reaction) values(target,who,emoji)
      on conflict do nothing;
  else
    delete from public.question_reactions r where r.question_id = target and r.author_id = who and r.reaction = emoji;
  end if;
  return public.get_question_reactions(array[target]) -> target::text;
end;
$$;
create function public.notify_question_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare question uuid; scope uuid;
begin
  if tg_op = 'DELETE' then question := old.question_id; else question := new.question_id; end if;
  select q.room_id into scope from public.questions q where q.id = question;
  if found then perform public.invalidate_question(question,scope); end if;
  return null;
end;
$$;
create trigger question_reactions_realtime after insert or update or delete on public.question_reactions
  for each row execute function public.notify_question_reaction();
revoke all on function public.notify_question_reaction() from public, anon, authenticated;
revoke all on function public.get_question_reactions(uuid[]), public.set_question_emoji_reaction(uuid,text,boolean) from public;
grant execute on function public.get_question_reactions(uuid[]) to anon, authenticated;
grant execute on function public.set_question_emoji_reaction(uuid,text,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
