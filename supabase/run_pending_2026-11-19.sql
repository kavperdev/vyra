-- VYRA: wszystkie oczekujące migracje w jednym pliku. Bezpieczne do ponownego uruchomienia (drop if exists / create if not exists / create or replace).
-- Wklej w Supabase → SQL Editor → Run. Kolejność ma znaczenie.

-- ===== 20261119000600_assistant_usage.sql =====
-- VYRA · free in-app assistant ("Puls"): a daily question counter per user, so the free assistant has a cost cap.
-- Safe to run more than once.

create table if not exists public.assistant_usage (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null default current_date,
  count    int not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;
drop policy if exists assistant_usage_select on public.assistant_usage;
create policy assistant_usage_select on public.assistant_usage for select to authenticated using (user_id = auth.uid());

-- Counts one question for the signed-in user and says whether it fits today's limit.
create or replace function public.bump_assistant(p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is null then return -1; end if;
  insert into public.assistant_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.assistant_usage.count + 1
  returning count into n;
  return case when n > p_limit then -1 else p_limit - n end;
end;
$$;
revoke all on function public.bump_assistant(int) from public;
grant execute on function public.bump_assistant(int) to authenticated;

-- ===== 20261119000700_moments.sql =====
-- Ekipa: friends see the trainings you choose to share, react (🔥 / 🙌) and comment.
-- Only what the runner shares: sport, distance, time, title. Never readiness, pain, notes or health data.

create table if not exists public.app_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id text not null,
  day date not null,
  sport text not null default 'run',
  km numeric(7, 2) not null default 0,
  sec int not null default 0,
  title text,
  visibility text not null default 'friends' check (visibility in ('friends', 'me')),
  created_at timestamptz not null default now(),
  unique (user_id, run_id)
);
create index if not exists app_moments_user_day on public.app_moments (user_id, day desc);

create table if not exists public.app_moment_reactions (
  moment_id uuid not null references public.app_moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('fire', 'five')),
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id, kind)
);

create table if not exists public.app_moment_comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.app_moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists app_moment_comments_m on public.app_moment_comments (moment_id, created_at);

alter table public.app_moments enable row level security;
alter table public.app_moment_reactions enable row level security;
alter table public.app_moment_comments enable row level security;
revoke all on public.app_moments, public.app_moment_reactions, public.app_moment_comments from anon, authenticated;

-- Can I see this moment? Mine, or a friend's shared with friends.
create or replace function public.moment_visible(p_moment uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_moments m
     where m.id = p_moment
       and (m.user_id = auth.uid()
            or (m.visibility = 'friends' and m.user_id in (select f.friend_id from public.app_friends f where f.user_id = auth.uid())))
  );
$$;

-- Share (or update) one training from my diary.
create or replace function public.moment_share(p_run_id text, p_day date, p_sport text, p_km numeric, p_sec int, p_title text, p_visibility text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into public.app_moments (user_id, run_id, day, sport, km, sec, title, visibility)
  values (auth.uid(), left(p_run_id, 80), p_day, left(coalesce(p_sport, 'run'), 20),
          greatest(0, least(coalesce(p_km, 0), 500)), greatest(0, least(coalesce(p_sec, 0), 86400)),
          left(nullif(trim(p_title), ''), 80), case when p_visibility = 'me' then 'me' else 'friends' end)
  on conflict (user_id, run_id) do update set
    day = excluded.day, sport = excluded.sport, km = excluded.km, sec = excluded.sec, title = excluded.title, visibility = excluded.visibility
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.moment_unshare(p_run_id text) returns void
language sql security definer set search_path = public as $$
  delete from public.app_moments where user_id = auth.uid() and run_id = p_run_id;
$$;

-- The feed: mine and my friends' shared trainings, newest first, with reactions and comment counts.
create or replace function public.moments_feed(p_limit int default 40, p_before date default null)
returns table (id uuid, user_id uuid, name text, me boolean, streak int, run_id text, day date, sport text, km numeric, sec int, title text, visibility text,
               fire int, five int, my_fire boolean, my_five boolean, comments int)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, coalesce(r.name, 'Biegacz'), m.user_id = auth.uid(), coalesce(r.streak, 0), m.run_id, m.day, m.sport, m.km, m.sec, m.title, m.visibility,
         (select count(*)::int from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'fire'),
         (select count(*)::int from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'five'),
         exists (select 1 from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'fire' and x.user_id = auth.uid()),
         exists (select 1 from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'five' and x.user_id = auth.uid()),
         (select count(*)::int from public.app_moment_comments c where c.moment_id = m.id)
    from public.app_moments m
    left join public.app_runners r on r.user_id = m.user_id
   where (m.user_id = auth.uid()
          or (m.visibility = 'friends' and m.user_id in (select f.friend_id from public.app_friends f where f.user_id = auth.uid())))
     and (p_before is null or m.day < p_before)
     and m.day >= current_date - 60
   order by m.day desc, m.created_at desc
   limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

-- 🔥 or 🙌: tap to give, tap again to take back. Returns true when given.
create or replace function public.moment_react(p_moment uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.moment_visible(p_moment) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_kind not in ('fire', 'five') then raise exception 'BAD_KIND' using errcode = 'P0001'; end if;
  delete from public.app_moment_reactions where moment_id = p_moment and user_id = auth.uid() and kind = p_kind;
  if found then return false; end if;
  insert into public.app_moment_reactions (moment_id, user_id, kind) values (p_moment, auth.uid(), p_kind);
  return true;
end $$;

create or replace function public.moment_comment(p_moment uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.moment_visible(p_moment) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if (select count(*) from public.app_moment_comments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;
  insert into public.app_moment_comments (moment_id, user_id, body) values (p_moment, auth.uid(), left(trim(p_body), 300)) returning id into v_id;
  return v_id;
end $$;

-- Delete my comment, or any comment under my own training.
create or replace function public.moment_uncomment(p_comment uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.app_moment_comments c
   where c.id = p_comment
     and (c.user_id = auth.uid() or exists (select 1 from public.app_moments m where m.id = c.moment_id and m.user_id = auth.uid()));
$$;

create or replace function public.moment_comments(p_moment uuid)
returns table (id uuid, user_id uuid, name text, me boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, coalesce(r.name, 'Biegacz'), c.user_id = auth.uid(), c.body, c.created_at
    from public.app_moment_comments c
    left join public.app_runners r on r.user_id = c.user_id
   where c.moment_id = p_moment and public.moment_visible(p_moment)
   order by c.created_at
   limit 100;
$$;

revoke execute on function public.moment_visible(uuid), public.moment_share(text, date, text, numeric, int, text, text), public.moment_unshare(text),
  public.moments_feed(int, date), public.moment_react(uuid, text), public.moment_comment(uuid, text), public.moment_uncomment(uuid), public.moment_comments(uuid) from public, anon;
grant execute on function public.moment_visible(uuid), public.moment_share(text, date, text, numeric, int, text, text), public.moment_unshare(text),
  public.moments_feed(int, date), public.moment_react(uuid, text), public.moment_comment(uuid, text), public.moment_uncomment(uuid), public.moment_comments(uuid) to authenticated;

-- ===== 20261119000800_club_sport_categories.sql =====
-- Club sports plan practices, not runs: technique, tactics, game play, matches, sparring, swim sets.
alter table public.training_sessions drop constraint if exists training_sessions_category_check;
alter table public.training_sessions add constraint training_sessions_category_check check (category in (
  'easy', 'recovery', 'long', 'tempo', 'threshold', 'intervals', 'fartlek', 'hills',
  'progression', 'race_pace', 'test', 'race', 'custom_run',
  'strength', 'power', 'circuit', 'mobility', 'motor_prep', 'other',
  'technique', 'tactics', 'game', 'match', 'sparring', 'swim'));

-- ===== 20261119000900_group_runs.sql =====
-- Wspólne biegi: runners post a run (city, public meeting place, time, distance, pace) and others join.
-- VYRA only shows the notices; it does not organise the runs. Using it needs the rules accepted (18+).

create table if not exists public.group_run_terms (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  adult boolean not null default false,
  accepted_at timestamptz not null default now()
);

create table if not exists public.group_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city text not null check (char_length(city) between 2 and 60),
  place text not null check (char_length(place) between 3 and 120),
  starts_at timestamptz not null,
  distance_km numeric(5, 1) check (distance_km is null or distance_km between 1 and 60),
  pace text check (pace is null or char_length(pace) <= 20),
  level text not null default 'easy' check (level in ('easy', 'steady', 'fast')),
  note text check (note is null or char_length(note) <= 300),
  max_people int not null default 8 check (max_people between 2 and 30),
  cancelled boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists group_runs_when on public.group_runs (starts_at) where not cancelled and not hidden;

create table if not exists public.group_run_people (
  run_id uuid not null references public.group_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (run_id, user_id)
);

create table if not exists public.group_run_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.group_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (run_id, user_id)
);

alter table public.group_run_terms enable row level security;
alter table public.group_runs enable row level security;
alter table public.group_run_people enable row level security;
alter table public.group_run_reports enable row level security;
revoke all on public.group_run_terms, public.group_runs, public.group_run_people, public.group_run_reports from anon, authenticated;

create or replace function public.group_run_terms_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_run_terms where user_id = auth.uid() and adult and version = '2026-11');
$$;

create or replace function public.group_run_accept(p_adult boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not coalesce(p_adult, false) then raise exception 'ADULT_ONLY' using errcode = 'P0001'; end if;
  insert into public.group_run_terms (user_id, version, adult) values (auth.uid(), '2026-11', true)
  on conflict (user_id) do update set version = '2026-11', adult = true, accepted_at = now();
end $$;

create or replace function public.group_run_create(p_city text, p_place text, p_starts_at timestamptz, p_distance numeric, p_pace text, p_level text, p_note text, p_max int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.group_run_terms_ok() then raise exception 'TERMS' using errcode = 'P0001'; end if;
  if p_starts_at < now() or p_starts_at > now() + interval '30 days' then raise exception 'BAD_TIME' using errcode = 'P0001'; end if;
  if (select count(*) from public.group_runs where user_id = auth.uid() and not cancelled and starts_at > now()) >= 5 then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;
  insert into public.group_runs (user_id, city, place, starts_at, distance_km, pace, level, note, max_people)
  values (auth.uid(), trim(p_city), trim(p_place), p_starts_at, p_distance, nullif(trim(p_pace), ''), coalesce(p_level, 'easy'), nullif(trim(p_note), ''), greatest(2, least(coalesce(p_max, 8), 30)))
  returning id into v_id;
  insert into public.group_run_people (run_id, user_id) values (v_id, auth.uid());
  return v_id;
end $$;

-- Upcoming runs (optionally in one city). Only first names are shown, never e-mail or surname.
create or replace function public.group_runs_list(p_city text default null)
returns table (id uuid, host text, mine boolean, city text, place text, starts_at timestamptz, distance_km numeric, pace text, level text, note text,
               max_people int, people int, joined boolean)
language sql stable security definer set search_path = public as $$
  select r.id, split_part(coalesce(nullif(trim(p.full_name), ''), 'Biegacz'), ' ', 1), r.user_id = auth.uid(), r.city, r.place, r.starts_at, r.distance_km, r.pace, r.level, r.note,
         r.max_people,
         (select count(*)::int from public.group_run_people x where x.run_id = r.id),
         exists (select 1 from public.group_run_people x where x.run_id = r.id and x.user_id = auth.uid())
    from public.group_runs r
    left join public.profiles p on p.id = r.user_id
   where auth.uid() is not null and not r.cancelled and not r.hidden
     and r.starts_at > now() - interval '1 hour'
     and (p_city is null or trim(p_city) = '' or r.city ilike trim(p_city))
   order by r.starts_at
   limit 60;
$$;

-- First names of the people going: only for the host and those who joined.
create or replace function public.group_run_people_names(p_run uuid) returns setof text
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(nullif(trim(p.full_name), ''), 'Biegacz'), ' ', 1)
    from public.group_run_people x left join public.profiles p on p.id = x.user_id
   where x.run_id = p_run
     and exists (select 1 from public.group_run_people me where me.run_id = p_run and me.user_id = auth.uid())
   order by x.created_at;
$$;

create or replace function public.group_run_join(p_run uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.group_runs;
begin
  if auth.uid() is null or not public.group_run_terms_ok() then raise exception 'TERMS' using errcode = 'P0001'; end if;
  select * into r from public.group_runs where id = p_run;
  if r.id is null or r.cancelled or r.hidden or r.starts_at < now() then raise exception 'GONE' using errcode = 'P0001'; end if;
  if (select count(*) from public.group_run_people where run_id = p_run) >= r.max_people then raise exception 'FULL' using errcode = 'P0001'; end if;
  insert into public.group_run_people (run_id, user_id) values (p_run, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.group_run_leave(p_run uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.group_run_people where run_id = p_run and user_id = auth.uid()
     and not exists (select 1 from public.group_runs r where r.id = p_run and r.user_id = auth.uid());
$$;

create or replace function public.group_run_cancel(p_run uuid) returns void
language sql security definer set search_path = public as $$
  update public.group_runs set cancelled = true where id = p_run and user_id = auth.uid();
$$;

-- A report hides the run at once after 3 different people report it; the founder sees all reports.
create or replace function public.group_run_report(p_run uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into public.group_run_reports (run_id, user_id, reason) values (p_run, auth.uid(), left(trim(p_reason), 500)) on conflict do nothing;
  if (select count(*) from public.group_run_reports where run_id = p_run) >= 3 then
    update public.group_runs set hidden = true where id = p_run;
  end if;
end $$;

revoke execute on function public.group_run_terms_ok(), public.group_run_accept(boolean),
  public.group_run_create(text, text, timestamptz, numeric, text, text, text, int), public.group_runs_list(text),
  public.group_run_people_names(uuid), public.group_run_join(uuid), public.group_run_leave(uuid), public.group_run_cancel(uuid),
  public.group_run_report(uuid, text) from public, anon;
grant execute on function public.group_run_terms_ok(), public.group_run_accept(boolean),
  public.group_run_create(text, text, timestamptz, numeric, text, text, text, int), public.group_runs_list(text),
  public.group_run_people_names(uuid), public.group_run_join(uuid), public.group_run_leave(uuid), public.group_run_cancel(uuid),
  public.group_run_report(uuid, text) to authenticated;
