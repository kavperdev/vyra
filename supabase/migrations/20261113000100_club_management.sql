-- Club management on top of club spaces: training groups and weekly schedule, club events and
-- cancellations, membership fees paid by bank transfer, guardians with a read-only family page,
-- athlete documents (medical exams, consents) and announcements.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('session_assigned', 'session_rescheduled', 'session_updated', 'comment',
                  'execution_logged', 'invite_accepted', 'reminder', 'assigned', 'camp_info',
                  'fee_due', 'announcement', 'event_new', 'event_cancelled'));

-- ---------------------------------------------------------------- helpers
create or replace function public.is_club_staff(p_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_founder() or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach' and club_id = p_club)
$$;

create or replace function public.is_club_manager(p_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_club_staff(p_club) and public.can_plan()
$$;

create or replace function public.is_club_member(p_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and club_id = p_club)
$$;

-- Everyone on a club's staff works with every athlete of that club (links kept in sync).
create or replace function public.profiles_link_club() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.club_id is null or (tg_op = 'UPDATE' and new.club_id is not distinct from old.club_id) then
    return null;
  end if;
  if new.role = 'athlete' then
    insert into public.coach_athletes (coach_id, athlete_id)
      select p.id, new.id from public.profiles p where p.role = 'coach' and p.club_id = new.club_id
      on conflict do nothing;
  else
    insert into public.coach_athletes (coach_id, athlete_id)
      select new.id, p.id from public.profiles p where p.role = 'athlete' and p.club_id = new.club_id
      on conflict do nothing;
  end if;
  return null;
end $$;
drop trigger if exists profiles_link_club on public.profiles;
create trigger profiles_link_club after insert or update of club_id on public.profiles
  for each row execute function public.profiles_link_club();

alter table public.sport_clubs add column if not exists bank_account text check (char_length(bank_account) <= 64);
alter table public.sport_clubs add column if not exists bank_recipient text check (char_length(bank_recipient) <= 160);

-- Founders pick the club for an athlete without an account; club staff always use their own.
drop function if exists public.create_managed_athlete(text, int);
create or replace function public.create_managed_athlete(p_name text, p_birth_year int default null, p_club uuid default null)
returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id   uuid := gen_random_uuid();
  v_name text := trim(coalesce(p_name, ''));
  v_club uuid := case when public.is_founder() then coalesce(p_club, public.my_club_id()) else public.my_club_id() end;
  v_has_aud boolean;
begin
  if not public.can_plan() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'NAME_INVALID' using errcode = 'P0001';
  end if;
  perform set_config('vyra.managed_user', v_id::text, true);
  select exists (select 1 from information_schema.columns
                 where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') into v_has_aud;
  if v_has_aud then
    execute 'insert into auth.users (id, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
             values ($1, ''authenticated'', ''authenticated'', $2, ''{"provider":"managed"}''::jsonb, now(), now())'
      using v_id, jsonb_build_object('full_name', v_name, 'managed', true);
  else
    insert into auth.users (id, raw_user_meta_data) values (v_id, jsonb_build_object('full_name', v_name, 'managed', true));
  end if;
  perform set_config('vyra.managed_user', '', true);

  insert into public.profiles (id, role, full_name, managed, club_id) values (v_id, 'athlete', v_name, true, v_club);
  insert into public.athlete_profiles (athlete_id, birth_year)
    values (v_id, case when p_birth_year between 1930 and 2030 then p_birth_year end);
  insert into public.coach_athletes (coach_id, athlete_id) values (auth.uid(), v_id) on conflict do nothing;
  insert into public.coach_athletes (coach_id, athlete_id)
    select id, v_id from public.profiles where staff_role = 'founder' on conflict do nothing;
  return v_id;
end $$;

-- ---------------------------------------------------------------- groups and schedule
create table if not exists public.club_groups (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.sport_clubs (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  description text check (char_length(description) <= 500),
  color       text not null default '#f03339' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now()
);
create index if not exists club_groups_club_idx on public.club_groups (club_id);

create table if not exists public.club_group_members (
  group_id    uuid not null references public.club_groups (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (group_id, athlete_id)
);
create index if not exists club_group_members_athlete_idx on public.club_group_members (athlete_id);

create table if not exists public.club_schedule (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.club_groups (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  place       text check (char_length(place) <= 160),
  valid_from  date not null default current_date,
  valid_to    date,
  check (end_time > start_time)
);
create index if not exists club_schedule_group_idx on public.club_schedule (group_id);

-- One-off events, and changes to a single occurrence of a weekly slot (schedule_id + occurs_on).
create table if not exists public.club_events (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.sport_clubs (id) on delete cascade,
  group_id    uuid references public.club_groups (id) on delete cascade,
  schedule_id uuid references public.club_schedule (id) on delete cascade,
  occurs_on   date,
  kind        text not null default 'training' check (kind in ('training', 'competition', 'meeting', 'other')),
  title       text not null check (char_length(trim(title)) between 1 and 160),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  place       text check (char_length(place) <= 160),
  cancelled   boolean not null default false,
  note        text check (char_length(note) <= 1000),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  check ((schedule_id is null) = (occurs_on is null))
);
create index if not exists club_events_club_idx on public.club_events (club_id, starts_at);
create unique index if not exists club_events_occurrence_idx on public.club_events (schedule_id, occurs_on) where schedule_id is not null;

create or replace function public.group_club(p_group uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.club_groups where id = p_group
$$;

create or replace function public.in_group(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_group_members where group_id = p_group and athlete_id = auth.uid())
$$;

-- ---------------------------------------------------------------- fees (bank transfer)
create table if not exists public.fee_plans (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.sport_clubs (id) on delete cascade,
  group_id    uuid references public.club_groups (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  amount      numeric(10, 2) not null check (amount > 0 and amount < 100000),
  due_day     smallint not null default 10 check (due_day between 1 and 28),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists fee_plans_club_idx on public.fee_plans (club_id);

create table if not exists public.fee_discounts (
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  fee_plan_id uuid not null references public.fee_plans (id) on delete cascade,
  percent     numeric(5, 2) not null check (percent > 0 and percent <= 100),
  valid_until date,
  note        text check (char_length(note) <= 300),
  primary key (athlete_id, fee_plan_id)
);

create table if not exists public.fee_charges (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.sport_clubs (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  fee_plan_id uuid references public.fee_plans (id) on delete set null,
  period      date not null,
  title       text not null check (char_length(title) <= 160),
  amount      numeric(10, 2) not null check (amount >= 0),
  due_date    date not null,
  status      text not null default 'due' check (status in ('due', 'paid', 'cancelled')),
  paid_at     timestamptz,
  paid_amount numeric(10, 2),
  method      text check (method in ('transfer', 'cash', 'online', 'other')),
  code        text not null unique default ('VY' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7))),
  note        text check (char_length(note) <= 300),
  reminded_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists fee_charges_unique_idx on public.fee_charges (athlete_id, fee_plan_id, period) where fee_plan_id is not null;
create index if not exists fee_charges_club_idx on public.fee_charges (club_id, period, status);

-- Bill everyone in the plans' groups (or the whole club) for one month. Safe to run twice.
create or replace function public.generate_fee_charges(p_club uuid, p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', p_month)::date;
  v_n int := 0;
  v_rows int;
  v_plan public.fee_plans;
begin
  if not public.is_club_manager(p_club) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  for v_plan in select * from public.fee_plans where club_id = p_club and active loop
    with ins as (
      insert into public.fee_charges (club_id, athlete_id, fee_plan_id, period, title, amount, due_date)
      select p_club, a.id, v_plan.id, v_period,
             v_plan.name || ' · ' || to_char(v_period, 'MM.YYYY'),
             round(v_plan.amount * (1 - coalesce(d.percent, 0) / 100.0), 2),
             v_period + (v_plan.due_day - 1)
      from public.profiles a
      left join public.fee_discounts d on d.athlete_id = a.id and d.fee_plan_id = v_plan.id
           and (d.valid_until is null or d.valid_until >= v_period)
      where a.role = 'athlete' and a.club_id = p_club
        and (v_plan.group_id is null or exists (select 1 from public.club_group_members m where m.group_id = v_plan.group_id and m.athlete_id = a.id))
      on conflict do nothing
      returning athlete_id, title, amount, due_date
    ), note as (
      -- In-app and push notice for athletes with an account.
      insert into public.notifications (user_id, type, title, body, link, session_id)
      select i.athlete_id, 'fee_due', 'Składka: ' || to_char(i.amount, 'FM999990.00') || ' zł',
             i.title || ' · termin ' || to_char(i.due_date, 'DD.MM.YYYY'), '/athlete/klub', null
      from ins i join public.profiles p on p.id = i.athlete_id and not p.managed
      returning 1
    )
    select count(*) into v_rows from ins;
    v_n := v_n + v_rows;
  end loop;
  return v_n;
end $$;

-- Reminder for unpaid charges: in-app/push for athletes with an account; returns rows for e-mails.
create or replace function public.remind_fee_charges(p_ids uuid[])
returns table (charge_id uuid, athlete_id uuid, title text, amount numeric, due_date date, code text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with c as (
    update public.fee_charges f set reminded_at = now()
    where f.id = any (p_ids) and f.status = 'due' and public.is_club_manager(f.club_id)
    returning f.id, f.athlete_id, f.title, f.amount, f.due_date, f.code
  ), n as (
    insert into public.notifications (user_id, type, title, body, link, session_id)
    select c.athlete_id, 'fee_due', 'Przypomnienie: ' || to_char(c.amount, 'FM999990.00') || ' zł',
           c.title || ' · termin ' || to_char(c.due_date, 'DD.MM.YYYY'), '/athlete/klub', null
    from c join public.profiles p on p.id = c.athlete_id and not p.managed
    returning 1
  )
  select c.id, c.athlete_id, c.title, c.amount, c.due_date, c.code from c;
end $$;
revoke execute on function public.remind_fee_charges(uuid[]) from public, anon;
grant execute on function public.remind_fee_charges(uuid[]) to authenticated;

-- ---------------------------------------------------------------- guardians and documents
create table if not exists public.athlete_guardians (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles (id) on delete cascade,
  full_name    text not null check (char_length(trim(full_name)) between 2 and 120),
  email        text check (char_length(email) <= 200),
  phone        text check (char_length(phone) <= 40),
  relation     text check (char_length(relation) <= 40),
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at   timestamptz not null default now()
);
create index if not exists athlete_guardians_athlete_idx on public.athlete_guardians (athlete_id);

create table if not exists public.athlete_documents (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('medical', 'rodo', 'photo_consent', 'other')),
  title        text check (char_length(title) <= 160),
  signed_on    date,
  valid_until  date,
  note         text check (char_length(note) <= 500),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists athlete_documents_athlete_idx on public.athlete_documents (athlete_id);

-- ---------------------------------------------------------------- announcements
create table if not exists public.club_announcements (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.sport_clubs (id) on delete cascade,
  group_id    uuid references public.club_groups (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 160),
  body        text not null check (char_length(body) <= 4000),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  emailed_at  timestamptz
);
create index if not exists club_announcements_club_idx on public.club_announcements (club_id, created_at desc);

-- Athletes (with an account) in a group, or in the whole club.
create or replace function public.club_audience(p_club uuid, p_group uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
  where p.role = 'athlete' and p.club_id = p_club and not p.managed
    and (p_group is null or exists (select 1 from public.club_group_members m where m.group_id = p_group and m.athlete_id = p.id))
$$;

create or replace function public.club_announcements_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(a, 'announcement', new.title, left(new.body, 140), '/athlete/klub', null)
  from public.club_audience(new.club_id, new.group_id) a;
  return null;
end $$;
drop trigger if exists club_announcements_notify on public.club_announcements;
create trigger club_announcements_notify after insert on public.club_announcements
  for each row execute function public.club_announcements_notify();

-- New one-off events and cancellations reach the group.
create or replace function public.club_events_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_when text := to_char(new.starts_at at time zone 'Europe/Warsaw', 'DD.MM, HH24:MI');
begin
  if tg_op = 'INSERT' and new.cancelled then
    perform public.notify(a, 'event_cancelled', 'Odwołane: ' || new.title, v_when, '/athlete/klub', null)
    from public.club_audience(new.club_id, new.group_id) a;
  elsif tg_op = 'INSERT' then
    perform public.notify(a, 'event_new', new.title, v_when || coalesce(' · ' || new.place, ''), '/athlete/klub', null)
    from public.club_audience(new.club_id, new.group_id) a;
  elsif new.cancelled and not old.cancelled then
    perform public.notify(a, 'event_cancelled', 'Odwołane: ' || new.title, v_when, '/athlete/klub', null)
    from public.club_audience(new.club_id, new.group_id) a;
  end if;
  return null;
end $$;
drop trigger if exists club_events_notify on public.club_events;
create trigger club_events_notify after insert or update on public.club_events
  for each row execute function public.club_events_notify();

-- ---------------------------------------------------------------- RLS
alter table public.club_groups enable row level security;
alter table public.club_group_members enable row level security;
alter table public.club_schedule enable row level security;
alter table public.club_events enable row level security;
alter table public.fee_plans enable row level security;
alter table public.fee_discounts enable row level security;
alter table public.fee_charges enable row level security;
alter table public.athlete_guardians enable row level security;
alter table public.athlete_documents enable row level security;
alter table public.club_announcements enable row level security;

do $$
declare t text;
begin
  foreach t in array array['club_groups','club_group_members','club_schedule','club_events','fee_plans','fee_discounts',
                           'fee_charges','athlete_guardians','athlete_documents','club_announcements'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_write on public.%1$s', t);
    execute format('grant select, insert, update, delete on public.%1$s to authenticated', t);
  end loop;
end $$;

create policy club_groups_select on public.club_groups for select to authenticated
  using (public.is_club_staff(club_id) or public.is_club_member(club_id));
create policy club_groups_write on public.club_groups for all to authenticated
  using (public.is_club_manager(club_id)) with check (public.is_club_manager(club_id));

create policy club_group_members_select on public.club_group_members for select to authenticated
  using (public.is_club_staff(public.group_club(group_id)) or athlete_id = auth.uid());
create policy club_group_members_write on public.club_group_members for all to authenticated
  using (public.is_club_manager(public.group_club(group_id)))
  with check (public.is_club_manager(public.group_club(group_id))
              and exists (select 1 from public.profiles p where p.id = athlete_id and p.club_id = public.group_club(group_id)));

create policy club_schedule_select on public.club_schedule for select to authenticated
  using (public.is_club_staff(public.group_club(group_id)) or public.is_club_member(public.group_club(group_id)));
create policy club_schedule_write on public.club_schedule for all to authenticated
  using (public.is_club_manager(public.group_club(group_id))) with check (public.is_club_manager(public.group_club(group_id)));

create policy club_events_select on public.club_events for select to authenticated
  using (public.is_club_staff(club_id) or public.is_club_member(club_id));
create policy club_events_write on public.club_events for all to authenticated
  using (public.is_club_manager(club_id))
  with check (public.is_club_manager(club_id) and (group_id is null or public.group_club(group_id) = club_id));

create policy fee_plans_select on public.fee_plans for select to authenticated
  using (public.is_club_staff(club_id));
create policy fee_plans_write on public.fee_plans for all to authenticated
  using (public.is_club_manager(club_id))
  with check (public.is_club_manager(club_id) and (group_id is null or public.group_club(group_id) = club_id));

create policy fee_discounts_select on public.fee_discounts for select to authenticated
  using (public.is_club_staff((select club_id from public.fee_plans where id = fee_plan_id)) or athlete_id = auth.uid());
create policy fee_discounts_write on public.fee_discounts for all to authenticated
  using (public.is_club_manager((select club_id from public.fee_plans where id = fee_plan_id)))
  with check (public.is_club_manager((select club_id from public.fee_plans where id = fee_plan_id)));

create policy fee_charges_select on public.fee_charges for select to authenticated
  using (public.is_club_staff(club_id) or athlete_id = auth.uid());
create policy fee_charges_write on public.fee_charges for all to authenticated
  using (public.is_club_manager(club_id)) with check (public.is_club_manager(club_id));

create policy athlete_guardians_select on public.athlete_guardians for select to authenticated
  using (public.is_coach_of(athlete_id) or athlete_id = auth.uid());
create policy athlete_guardians_write on public.athlete_guardians for all to authenticated
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));

create policy athlete_documents_select on public.athlete_documents for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy athlete_documents_write on public.athlete_documents for all to authenticated
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));

create policy club_announcements_select on public.club_announcements for select to authenticated
  using (public.is_club_staff(club_id) or (public.is_club_member(club_id) and (group_id is null or public.in_group(group_id))));
create policy club_announcements_write on public.club_announcements for all to authenticated
  using (public.is_club_staff(club_id))
  with check (public.is_club_staff(club_id) and (group_id is null or public.group_club(group_id) = club_id));

-- Club staff may edit the club's bank details too (sport_clubs_update already allows club staff).

-- ---------------------------------------------------------------- family page (no login, by secret link)
create or replace function public.get_family_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  g public.athlete_guardians;
  a public.profiles;
  c public.sport_clubs;
begin
  if p_token is null or char_length(p_token) < 24 then return null; end if;
  select * into g from public.athlete_guardians where access_token = p_token;
  if not found then return null; end if;
  select * into a from public.profiles where id = g.athlete_id;
  select * into c from public.sport_clubs where id = a.club_id;
  return jsonb_build_object(
    'guardian', g.full_name,
    'athlete', jsonb_build_object('id', a.id, 'name', a.full_name),
    'club', case when c.id is null then null else jsonb_build_object('name', c.name, 'city', c.city, 'logo_url', c.logo_url,
             'bank_account', c.bank_account, 'bank_recipient', coalesce(c.bank_recipient, c.name)) end,
    'groups', coalesce((select jsonb_agg(jsonb_build_object('id', gr.id, 'name', gr.name, 'color', gr.color,
               'slots', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'weekday', s.weekday, 'start', s.start_time, 'end', s.end_time, 'place', s.place,
                                   'valid_from', s.valid_from, 'valid_to', s.valid_to) order by s.weekday, s.start_time)
                                  from public.club_schedule s where s.group_id = gr.id), '[]'::jsonb)) order by gr.name)
             from public.club_groups gr join public.club_group_members m on m.group_id = gr.id and m.athlete_id = a.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('title', e.title, 'kind', e.kind, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
               'place', e.place, 'cancelled', e.cancelled, 'schedule_id', e.schedule_id, 'occurs_on', e.occurs_on, 'note', e.note) order by e.starts_at)
             from public.club_events e
             where e.club_id = a.club_id and e.starts_at >= now() - interval '1 day' and e.starts_at < now() + interval '45 days'
               and (e.group_id is null or exists (select 1 from public.club_group_members m where m.group_id = e.group_id and m.athlete_id = a.id))), '[]'::jsonb),
    'announcements', coalesce((select jsonb_agg(x order by (x ->> 'created_at') desc) from (
               select jsonb_build_object('title', n.title, 'body', n.body, 'created_at', n.created_at) x
               from public.club_announcements n
               where n.club_id = a.club_id
                 and (n.group_id is null or exists (select 1 from public.club_group_members m where m.group_id = n.group_id and m.athlete_id = a.id))
               order by n.created_at desc limit 10) q), '[]'::jsonb),
    'charges', coalesce((select jsonb_agg(jsonb_build_object('title', f.title, 'amount', f.amount, 'due_date', f.due_date, 'status', f.status,
               'code', f.code, 'paid_at', f.paid_at) order by f.period desc)
             from (select * from public.fee_charges where athlete_id = a.id and status <> 'cancelled' order by period desc limit 8) f), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('title', s.title, 'date', s.scheduled_date, 'time', s.scheduled_time, 'status', s.status)
               order by s.scheduled_date, s.scheduled_time)
             from public.training_sessions s
             where s.athlete_id = a.id and s.scheduled_date between current_date and current_date + 14), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('kind', d.kind, 'valid_until', d.valid_until))
             from public.athlete_documents d where d.athlete_id = a.id), '[]'::jsonb)
  );
end $$;

revoke execute on function public.is_club_staff(uuid), public.is_club_manager(uuid), public.is_club_member(uuid),
  public.group_club(uuid), public.in_group(uuid), public.generate_fee_charges(uuid, date), public.club_audience(uuid, uuid),
  public.create_managed_athlete(text, int, uuid) from public, anon;
grant execute on function public.is_club_staff(uuid), public.is_club_manager(uuid), public.is_club_member(uuid),
  public.group_club(uuid), public.in_group(uuid), public.generate_fee_charges(uuid, date), public.create_managed_athlete(text, int, uuid)
  to authenticated;
revoke execute on function public.get_family_view(text) from public;
grant execute on function public.get_family_view(text) to anon, authenticated;
