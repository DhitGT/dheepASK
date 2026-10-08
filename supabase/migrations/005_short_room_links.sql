-- Run after 004_private_rooms.sql. Existing UUID invitation links remain valid.
begin;
alter table public.rooms add column slug text;
alter table public.rooms add constraint rooms_slug_format
  check (slug ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]$');
create unique index rooms_slug_unique on public.rooms(lower(slug));

create function public.next_room_slug() returns text
language plpgsql security definer set search_path = '' as $$
declare candidate text; value integer; alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
begin
  perform pg_advisory_xact_lock(701923846);
  for attempt in 1..1000 loop
    candidate := '';
    for position in 1..7 loop
      -- Random UUID bytes provide cryptographic randomness. Reject biased values.
      loop
        value := ('x' || substr(replace(gen_random_uuid()::text,'-',''),1,2))::bit(8)::integer;
        exit when value < 234;
      end loop;
      candidate := candidate || substr(alphabet,value % 26 + 1,1);
    end loop;
    if not exists (select 1 from public.rooms r where lower(r.slug) = lower(candidate)) then return candidate; end if;
  end loop;
  raise exception 'Could not allocate a room code. Please retry.';
end;
$$;
revoke all on function public.next_room_slug() from public, anon, authenticated;
update public.rooms set slug = public.next_room_slug() where slug is null;
alter table public.rooms alter column slug set default public.next_room_slug();
alter table public.rooms alter column slug set not null;

create function public.resolve_room(room_link text) returns table
  (id uuid,title text,context text,token uuid,created_at timestamptz,my_alias text,is_owner boolean,slug text)
language plpgsql security definer set search_path = '' as $$
declare room_record public.rooms;
begin
  if auth.uid() is null then raise exception 'Session required'; end if;
  if room_link ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into room_record from public.rooms r where r.token::text = lower(room_link);
  else
    select * into room_record from public.rooms r where lower(r.slug) = lower(room_link);
  end if;
  if not found then return; end if;
  return query select j.*,room_record.slug from public.join_room(room_record.token) j;
end;
$$;
create function public.create_room_short(room_title text,room_context text,room_slug text default null) returns table
  (id uuid,title text,context text,token uuid,created_at timestamptz,my_alias text,is_owner boolean,slug text)
language plpgsql security definer set search_path = '' as $$
declare room_record public.rooms; who uuid := auth.uid();
begin
  if who is null then raise exception 'Session required'; end if;
  insert into public.rooms(author_id,title,context,slug)
    values (who,btrim(room_title),btrim(room_context),coalesce(nullif(btrim(room_slug),''),public.next_room_slug()))
    returning * into room_record;
  return query select * from public.resolve_room(room_record.slug);
end;
$$;
revoke all on function public.resolve_room(text), public.create_room_short(text,text,text) from public, anon;
grant execute on function public.resolve_room(text), public.create_room_short(text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
