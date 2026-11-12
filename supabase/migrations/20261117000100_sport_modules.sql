-- VYRA · sport modules for clubs: what each discipline needs on top of the shared club tools.
-- Safe to run more than once. Needs 20261113 (club management), 20261114 (development) and 20261116 (multi-sport).
--
-- Team sports (football, volleyball, handball, basketball) and martial-arts tournaments:
--   club_matches     matches and tournaments of a club (opponent, time, place, score / set scores)
--   match_callups    who is called up, their answer (athlete or parent), minutes, goals, assists,
--                    volleyball counters (stats), martial-arts weight limit (category_kg)
-- Football:   skill_ratings   coach's 1–5 ratings of technical skills, over time
-- Swimming:   swim_times      times per stroke / distance / pool length; swim_standards = club's qualifying limits
-- Martial arts: athlete_grades (belts and grades), athlete_weights (weigh-ins before tournaments)

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('session_assigned', 'session_rescheduled', 'session_updated', 'comment',
                  'execution_logged', 'invite_accepted', 'reminder', 'assigned', 'camp_info',
                  'fee_due', 'announcement', 'event_new', 'event_cancelled', 'callup'));

alter table public.athlete_profiles add column if not exists sex text check (sex in ('f', 'm'));
alter table public.sport_clubs add column if not exists grade_min_months int not null default 6 check (grade_min_months between 1 and 60);

-- ---------------------------------------------------------------- matches and call-ups
create table if not exists public.club_matches (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references public.sport_clubs (id) on delete cascade,
  group_id       uuid references public.club_groups (id) on delete set null,
  kind           text not null default 'match' check (kind in ('match', 'tournament')),
  opponent       text check (char_length(opponent) <= 120),
  title          text check (char_length(title) <= 160),
  home           boolean not null default true,
  starts_at      timestamptz not null,
  meet_at        timestamptz,
  place          text check (char_length(place) <= 200),
  competition    text check (char_length(competition) <= 120),
  status         text not null default 'planned' check (status in ('planned', 'played', 'cancelled')),
  score_for      int check (score_for between 0 and 999),
  score_against  int check (score_against between 0 and 999),
  sets           jsonb check (sets is null or (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) <= 7)),
  duration_min   int check (duration_min between 1 and 300),
  note           text check (char_length(note) <= 2000),
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists club_matches_club_idx on public.club_matches (club_id, starts_at);

create table if not exists public.match_callups (
  match_id     uuid not null references public.club_matches (id) on delete cascade,
  athlete_id   uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'yes', 'no')),
  replied_by   text check (replied_by in ('athlete', 'guardian', 'coach')),
  replied_at   timestamptz,
  starter      boolean not null default false,
  position     text check (char_length(position) <= 40),
  shirt        int check (shirt between 0 and 99),
  minutes      int check (minutes between 0 and 300),
  goals        int not null default 0 check (goals between 0 and 50),
  assists      int not null default 0 check (assists between 0 and 50),
  rating       int check (rating between 1 and 10),
  category_kg  numeric(5,1) check (category_kg between 15 and 200),
  result       text check (char_length(result) <= 80),
  stats        jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object' and pg_column_size(stats) < 2000),
  note         text check (char_length(note) <= 500),
  primary key (match_id, athlete_id)
);
create index if not exists match_callups_athlete_idx on public.match_callups (athlete_id);

create or replace function public.match_club(p_match uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.club_matches where id = p_match
$$;

alter table public.club_matches enable row level security;
alter table public.match_callups enable row level security;
drop policy if exists club_matches_select on public.club_matches;
drop policy if exists club_matches_write on public.club_matches;
create policy club_matches_select on public.club_matches for select to authenticated
  using (public.is_club_staff(club_id) or public.is_club_member(club_id));
create policy club_matches_write on public.club_matches for all to authenticated
  using (public.is_club_staff(club_id)) with check (public.is_club_staff(club_id));

drop policy if exists match_callups_select on public.match_callups;
drop policy if exists match_callups_write on public.match_callups;
create policy match_callups_select on public.match_callups for select to authenticated
  using (athlete_id = auth.uid() or public.is_club_staff(public.match_club(match_id)));
create policy match_callups_write on public.match_callups for all to authenticated
  using (public.is_club_staff(public.match_club(match_id))) with check (public.is_club_staff(public.match_club(match_id)));
grant select, insert, update, delete on public.club_matches, public.match_callups to authenticated;

-- A new call-up tells the athlete (and their phone) right away.
create or replace function public.match_callups_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.club_matches; v_club text;
begin
  select * into m from public.club_matches where id = new.match_id;
  if m.status <> 'planned' then return null; end if;
  select name into v_club from public.sport_clubs where id = m.club_id;
  perform public.notify(new.athlete_id, 'callup',
    'Powołanie: ' || coalesce(nullif(m.title, ''),
      case when m.kind = 'tournament' then 'turniej'
           when m.opponent is null then 'mecz'
           when m.home then v_club || ' – ' || m.opponent
           else m.opponent || ' – ' || v_club end),
    to_char(m.starts_at at time zone 'Europe/Warsaw', 'DD.MM HH24:MI') || coalesce(' · ' || m.place, '') || ' · potwierdź udział',
    '/athlete/klub', null);
  return null;
end $$;
drop trigger if exists match_callups_notify on public.match_callups;
create trigger match_callups_notify after insert on public.match_callups
  for each row execute function public.match_callups_notify();

-- The athlete answers their own call-up.
create or replace function public.reply_callup(p_match uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('yes', 'no') then return false; end if;
  update public.match_callups set status = p_status, replied_by = 'athlete', replied_at = now()
   where match_id = p_match and athlete_id = auth.uid()
     and exists (select 1 from public.club_matches m where m.id = p_match and m.status = 'planned');
  return found;
end $$;

-- A parent answers from the family page (no account, the guardian link is the key).
create or replace function public.guardian_reply_callup(p_token text, p_match uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare g public.athlete_guardians;
begin
  if p_status not in ('yes', 'no') or p_token is null or char_length(p_token) < 24 then return false; end if;
  select * into g from public.athlete_guardians where access_token = p_token;
  if not found then return false; end if;
  update public.match_callups set status = p_status, replied_by = 'guardian', replied_at = now()
   where match_id = p_match and athlete_id = g.athlete_id
     and exists (select 1 from public.club_matches m where m.id = p_match and m.status = 'planned');
  return found;
end $$;

-- What the family page shows: the club's sport and the child's call-ups (upcoming and the last results).
drop function if exists public.get_family_matches(text);
create or replace function public.get_family_matches(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.athlete_guardians; c public.sport_clubs;
begin
  if p_token is null or char_length(p_token) < 24 then return null; end if;
  select * into g from public.athlete_guardians where access_token = p_token;
  if not found then return null; end if;
  select s.* into c from public.sport_clubs s join public.profiles p on p.club_id = s.id where p.id = g.athlete_id;
  return jsonb_build_object('sport', c.sport, 'club', c.name, 'matches', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'kind', m.kind, 'title', m.title, 'opponent', m.opponent, 'home', m.home,
      'starts_at', m.starts_at, 'meet_at', m.meet_at, 'place', m.place, 'competition', m.competition,
      'status', m.status, 'score_for', m.score_for, 'score_against', m.score_against, 'sets', m.sets,
      'answer', cu.status, 'minutes', cu.minutes, 'goals', cu.goals, 'assists', cu.assists,
      'category_kg', cu.category_kg, 'result', cu.result) order by m.starts_at)
    from public.match_callups cu join public.club_matches m on m.id = cu.match_id
    where cu.athlete_id = g.athlete_id and m.status <> 'cancelled'
      and m.starts_at > now() - interval '45 days' and m.starts_at < now() + interval '60 days'), '[]'::jsonb));
end $$;

revoke execute on function public.reply_callup(uuid, text), public.guardian_reply_callup(text, uuid, text),
  public.get_family_matches(text), public.match_club(uuid) from public;
grant execute on function public.reply_callup(uuid, text), public.match_club(uuid) to authenticated;
grant execute on function public.guardian_reply_callup(text, uuid, text), public.get_family_matches(text) to anon, authenticated;

-- ---------------------------------------------------------------- per-athlete records (club set by trigger)
create table if not exists public.skill_ratings (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  club_id     uuid references public.sport_clubs (id) on delete set null,
  skill_key   text not null check (skill_key ~ '^[a-z0-9_]{2,40}$'),
  score       int not null check (score between 1 and 5),
  rated_on    date not null default current_date,
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  unique (athlete_id, skill_key, rated_on)
);

create table if not exists public.swim_times (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles (id) on delete cascade,
  club_id      uuid references public.sport_clubs (id) on delete set null,
  stroke       text not null check (stroke in ('free', 'back', 'breast', 'fly', 'im')),
  distance     int not null check (distance in (25, 50, 100, 200, 400, 800, 1500)),
  pool         int not null default 25 check (pool in (25, 50)),
  time_s       numeric(7,2) not null check (time_s between 8 and 3600),
  swum_on      date not null default current_date,
  competition  text check (char_length(competition) <= 120),
  recorded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists swim_times_athlete_idx on public.swim_times (athlete_id, stroke, distance, pool);

create table if not exists public.swim_standards (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.sport_clubs (id) on delete cascade,
  name             text not null check (char_length(trim(name)) between 2 and 120),
  stroke           text not null check (stroke in ('free', 'back', 'breast', 'fly', 'im')),
  distance         int not null check (distance in (25, 50, 100, 200, 400, 800, 1500)),
  pool             int not null default 25 check (pool in (25, 50)),
  sex              text check (sex in ('f', 'm')),
  birth_year_from  int check (birth_year_from between 1930 and 2030),
  birth_year_to    int check (birth_year_to between 1930 and 2030),
  time_s           numeric(7,2) not null check (time_s between 8 and 3600),
  created_at       timestamptz not null default now()
);

create table if not exists public.athlete_grades (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  club_id     uuid references public.sport_clubs (id) on delete set null,
  grade       text not null check (char_length(trim(grade)) between 1 and 40),
  color       text check (color ~ '^#[0-9a-fA-F]{6}$'),
  awarded_on  date not null default current_date,
  examiner    text check (char_length(examiner) <= 120),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid()
);
create index if not exists athlete_grades_athlete_idx on public.athlete_grades (athlete_id, awarded_on);

create table if not exists public.athlete_weights (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  club_id     uuid references public.sport_clubs (id) on delete set null,
  weight_kg   numeric(5,1) not null check (weight_kg between 15 and 250),
  measured_on date not null default current_date,
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  unique (athlete_id, measured_on)
);

do $$
declare t text;
begin
  foreach t in array array['skill_ratings', 'swim_times', 'athlete_grades', 'athlete_weights'] loop
    execute format('drop trigger if exists %1$s_club on public.%1$s', t);
    execute format('create trigger %1$s_club before insert or update of athlete_id on public.%1$s for each row execute function public.fitness_results_club()', t);
    execute format('alter table public.%s enable row level security', t);
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_write on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (athlete_id = auth.uid() or public.can_test_athlete(athlete_id))', t);
    execute format('create policy %1$s_write on public.%1$s for all to authenticated using (public.can_test_athlete(athlete_id)) with check (public.can_test_athlete(athlete_id))', t);
    execute format('grant select, insert, update, delete on public.%s to authenticated', t);
  end loop;
end $$;

alter table public.swim_standards enable row level security;
drop policy if exists swim_standards_select on public.swim_standards;
drop policy if exists swim_standards_write on public.swim_standards;
create policy swim_standards_select on public.swim_standards for select to authenticated
  using (public.is_club_staff(club_id) or public.is_club_member(club_id));
create policy swim_standards_write on public.swim_standards for all to authenticated
  using (public.is_club_staff(club_id)) with check (public.is_club_staff(club_id));
grant select, insert, update, delete on public.swim_standards to authenticated;

-- What the family page shows for the child's sport: skill ratings (football), grades (martial arts),
-- personal bests (swimming).
create or replace function public.get_family_sport(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.athlete_guardians;
begin
  if p_token is null or char_length(p_token) < 24 then return null; end if;
  select * into g from public.athlete_guardians where access_token = p_token;
  if not found then return null; end if;
  return jsonb_build_object(
    'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', s.skill_key, 'score', s.score, 'rated_on', s.rated_on) order by s.rated_on)
                        from public.skill_ratings s where s.athlete_id = g.athlete_id), '[]'::jsonb),
    'grades', coalesce((select jsonb_agg(jsonb_build_object('grade', x.grade, 'color', x.color, 'awarded_on', x.awarded_on) order by x.awarded_on)
                        from public.athlete_grades x where x.athlete_id = g.athlete_id), '[]'::jsonb),
    'swim', coalesce((select jsonb_agg(jsonb_build_object('stroke', t.stroke, 'distance', t.distance, 'pool', t.pool, 'time_s', t.time_s, 'swum_on', t.swum_on))
                      from (select distinct on (stroke, distance, pool) * from public.swim_times where athlete_id = g.athlete_id
                            order by stroke, distance, pool, time_s) t), '[]'::jsonb));
end $$;
revoke execute on function public.get_family_sport(text) from public;
grant execute on function public.get_family_sport(text) to anon, authenticated;
