-- Run after 005_short_room_links.sql. Only aggregate counters are stored.
begin;
create table public.site_counters (
  key text primary key check (key in ('hits','heart','laugh','fire','clap','wow','love')),
  value bigint not null default 0 check (value >= 0)
);
insert into public.site_counters(key) values ('hits'),('heart'),('laugh'),('fire'),('clap'),('wow'),('love');
alter table public.site_counters enable row level security;
revoke all on public.site_counters from public, anon, authenticated;

create function public.get_site_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'hits', (select value from public.site_counters where key = 'hits'),
    'reactions', (select jsonb_object_agg(key,value) from public.site_counters where key <> 'hits')
  );
$$;
create function public.record_site_hit() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.site_counters set value = value + 1 where key = 'hits';
  return public.get_site_stats();
end;
$$;
create function public.add_site_reactions(delta jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if jsonb_typeof(delta) is distinct from 'object' or delta = '{}'::jsonb then
    raise exception 'A reaction batch is required.';
  end if;
  -- This is a transport batch limit; visitors can submit unlimited batches.
  for item in select key,value from jsonb_each(delta) order by key loop
    if item.key not in ('heart','laugh','fire','clap','wow','love')
      or jsonb_typeof(item.value) <> 'number'
      or item.value::text !~ '^[0-9]+$' then
      raise exception 'Invalid reaction.';
    end if;
    if item.value::numeric not between 1 and 1000 then raise exception 'Invalid reaction count.'; end if;
    update public.site_counters set value = value + item.value::text::integer where key = item.key;
  end loop;
  return public.get_site_stats();
end;
$$;
revoke all on function public.get_site_stats(), public.record_site_hit(), public.add_site_reactions(jsonb) from public;
-- Reactions deliberately need neither a sign-in nor the posting cooldown.
grant execute on function public.get_site_stats(), public.record_site_hit(), public.add_site_reactions(jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
