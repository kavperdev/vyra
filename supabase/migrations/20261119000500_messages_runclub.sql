-- Coach and athlete talk in one thread; founders can write to everyone signed up for a Run Club date.

-- ---------------------------------------------------------------- messages
create table if not exists public.coach_messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id in (coach_id, athlete_id))
);
create index if not exists coach_messages_thread_idx on public.coach_messages (coach_id, athlete_id, created_at desc);
create index if not exists coach_messages_athlete_idx on public.coach_messages (athlete_id, created_at desc);
alter table public.coach_messages enable row level security;

drop policy if exists coach_messages_read on public.coach_messages;
drop policy if exists coach_messages_send on public.coach_messages;
create policy coach_messages_read on public.coach_messages for select to authenticated
  using (auth.uid() in (coach_id, athlete_id));
-- Only inside an active coach-athlete pair, and only as yourself.
create policy coach_messages_send on public.coach_messages for insert to authenticated
  with check (
    sender_id = auth.uid() and auth.uid() in (coach_id, athlete_id)
    and exists (select 1 from public.coach_athletes ca where ca.coach_id = coach_messages.coach_id and ca.athlete_id = coach_messages.athlete_id and ca.status = 'active')
  );
grant select, insert on public.coach_messages to authenticated;

-- The reader marks the other side's messages as read.
create or replace function public.messages_read(p_other uuid) returns void
language sql security definer set search_path = public as $$
  update public.coach_messages set read_at = now()
   where read_at is null and sender_id = p_other
     and ((coach_id = auth.uid() and athlete_id = p_other) or (athlete_id = auth.uid() and coach_id = p_other));
$$;

-- Unread messages per thread for the signed-in person.
create or replace function public.messages_unread() returns table (other_id uuid, unread int, last_at timestamptz, last_body text, last_mine boolean)
language sql stable security definer set search_path = public as $$
  with mine as (
    select m.*, case when m.coach_id = auth.uid() then m.athlete_id else m.coach_id end as other
      from public.coach_messages m where auth.uid() in (m.coach_id, m.athlete_id)
  ), last as (
    select distinct on (other) other, created_at, body, sender_id from mine order by other, created_at desc
  )
  select l.other, (select count(*)::int from mine x where x.other = l.other and x.read_at is null and x.sender_id <> auth.uid()),
         l.created_at, left(l.body, 140), l.sender_id = auth.uid()
    from last l;
$$;

-- A new message notifies the other side (push follows from the notifications trigger).
create or replace function public.notify_coach_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_name text; v_link text;
begin
  select split_part(full_name, ' ', 1) into v_name from public.profiles where id = new.sender_id;
  if new.sender_id = new.coach_id then
    v_to := new.athlete_id; v_link := '/athlete/wiadomosci';
  else
    v_to := new.coach_id; v_link := '/coach/wiadomosci?z=' || new.athlete_id;
  end if;
  perform public.notify(v_to, 'comment', 'Wiadomość: ' || coalesce(v_name, 'VYRA'), left(new.body, 160), v_link, null);
  return new;
end $$;
drop trigger if exists coach_messages_notify on public.coach_messages;
create trigger coach_messages_notify after insert on public.coach_messages
  for each row execute function public.notify_coach_message();

revoke execute on function public.messages_read(uuid), public.messages_unread() from public, anon;
grant execute on function public.messages_read(uuid), public.messages_unread() to authenticated;

-- ---------------------------------------------------------------- Run Club announcement
-- Founders: a notification in the app (and on the phone) for everyone signed up who has a VYRA account.
create or replace function public.run_club_push(p_event uuid, p_title text, p_body text) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int := 0; r record;
begin
  if not public.is_founder() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  for r in
    select distinct p.id from public.run_club_signups s
      join public.profiles p on lower(p.email) = lower(s.email)
     where s.event_id = p_event
  loop
    perform public.notify(r.id, 'reminder', left(p_title, 120), left(p_body, 300), '/app/run-club', null);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public.run_club_push(uuid, text, text) from public, anon;
grant execute on function public.run_club_push(uuid, text, text) to authenticated;
