-- VYRA · push notifications and camp participants in the app (Etap 4)
--
-- Push: every row in public.notifications (new session, logged result, comment, …) is also sent
-- to the user's phones. A trigger posts the notification id to the app (/api/push) with pg_net;
-- the app claims it once with take_push_job() and sends it with Web Push.
-- Camps: participants get an athlete account (invitation), are linked by e-mail and see
-- "Mój obóz": the camp, information for participants and their own test report.

-- ---------------------------------------------------------------- push subscriptions
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  endpoint    text not null unique check (char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  user_agent  text check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.notifications add column pushed_at timestamptz;

-- Where the app receives push jobs. Change it when the site moves to its own domain:
--   update public.app_config set value = 'https://twoja-domena.pl/api/push' where key = 'push_endpoint';
insert into public.app_config (key, value) values ('push_endpoint', 'https://vyra-mu-blush.vercel.app/api/push')
  on conflict (key) do nothing;

-- pg_net is available on Supabase; elsewhere (tests) pushes are simply not sent.
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net not available, push delivery disabled';
end $$;

create or replace function public.notifications_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_url text := (select value from public.app_config where key = 'push_endpoint');
begin
  if v_url is null or not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    return null;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using v_url, jsonb_build_object('id', new.id), jsonb_build_object('Content-Type', 'application/json');
  end if;
  return null;
exception when others then
  -- A failed push must never block the action that created the notification.
  return null;
end $$;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.notifications_push();

-- Claims a fresh notification for delivery, once. Ids are random and short-lived, so the
-- caller (the app's /api/push route) needs no key: only the database knows them.
create or replace function public.take_push_job(p_id uuid)
returns table (title text, body text, link text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  v_n public.notifications;
begin
  update public.notifications set pushed_at = now()
    where id = p_id and pushed_at is null and created_at > now() - interval '10 minutes'
    returning * into v_n;
  if not found then return; end if;
  return query
    select v_n.title, v_n.body, v_n.link, s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s where s.user_id = v_n.user_id;
end $$;
revoke execute on function public.take_push_job(uuid) from public;
grant execute on function public.take_push_job(uuid) to anon, authenticated;

-- Removes a subscription the push service reported as gone (endpoints are unguessable URLs).
create or replace function public.drop_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint
$$;
revoke execute on function public.drop_push_subscription(text) from public;
grant execute on function public.drop_push_subscription(text) to anon, authenticated;

-- ---------------------------------------------------------------- camp participants in the app
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('session_assigned', 'session_rescheduled', 'session_updated', 'comment',
                  'execution_logged', 'invite_accepted', 'reminder', 'assigned', 'camp_info'));

-- Information only for participants: travel, what to bring, schedule, payment details.
create table public.camp_private_info (
  camp_id     uuid primary key references public.camps (id) on delete cascade,
  body        text not null default '' check (char_length(body) <= 20000),
  updated_at  timestamptz not null default now()
);
create trigger camp_private_info_updated before update on public.camp_private_info
  for each row execute function public.set_updated_at();

create or replace function public.is_camp_participant(p_camp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.camp_participants
                 where camp_id = p_camp and athlete_id = auth.uid() and status <> 'cancelled')
$$;
revoke execute on function public.is_camp_participant(uuid) from public, anon;
grant execute on function public.is_camp_participant(uuid) to authenticated;

alter table public.camp_private_info enable row level security;
create policy camp_private_info_select on public.camp_private_info for select to authenticated
  using (public.is_coach() or public.is_camp_participant(camp_id));
create policy camp_private_info_founder_write on public.camp_private_info for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
grant select, insert, update, delete on public.camp_private_info to authenticated;

-- Participants see their own camp even when it is closed or archived.
create policy camps_participant_select on public.camps for select to authenticated
  using (public.is_camp_participant(id));

-- New or changed participant information → notification (and push) for participants with an account.
create or replace function public.camp_private_info_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then return null; end if;
  if coalesce(new.body, '') = '' then return null; end if;
  insert into public.notifications (user_id, type, title, body, link)
  select p.athlete_id, 'camp_info', 'Nowe informacje: ' || c.title, left(new.body, 160), '/athlete/camp'
  from public.camp_participants p join public.camps c on c.id = p.camp_id
  where p.camp_id = new.camp_id and p.athlete_id is not null and p.status <> 'cancelled';
  return null;
end $$;
create trigger camp_private_info_notify after insert or update on public.camp_private_info
  for each row execute function public.camp_private_info_notify();

-- Link participants to an athlete account with the same e-mail (sign-up or later).
create or replace function public.link_camp_participants(p_user uuid, p_email text) returns void
language sql security definer set search_path = public as $$
  update public.camp_participants set athlete_id = p_user
  where athlete_id is null and email is not null and lower(email) = lower(p_email)
$$;
revoke execute on function public.link_camp_participants(uuid, text) from public, anon, authenticated;

create or replace function public.profiles_link_camps() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'athlete' and new.email is not null then
    perform public.link_camp_participants(new.id, new.email);
  end if;
  return null;
end $$;
create trigger profiles_link_camps after insert on public.profiles
  for each row execute function public.profiles_link_camps();

-- A participant added after the account already exists is linked at once.
create or replace function public.camp_participants_link() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.athlete_id is null and new.email is not null then
    select id into new.athlete_id from public.profiles
      where role = 'athlete' and lower(email) = lower(new.email) limit 1;
  end if;
  return new;
end $$;
create trigger camp_participants_link before insert or update of email on public.camp_participants
  for each row execute function public.camp_participants_link();

-- Existing data: link what can be linked now.
update public.camp_participants p set athlete_id = pr.id
from public.profiles pr
where p.athlete_id is null and p.email is not null and pr.role = 'athlete' and lower(pr.email) = lower(p.email);
