-- VYRA · core schema
-- Plan (training_sessions + running/strength children) is stored separately from
-- execution (workout_executions + *_results). Executions keep a frozen plan snapshot.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('coach', 'athlete');
create type public.session_kind as enum ('running', 'strength', 'mobility', 'other');
create type public.session_status as enum ('planned', 'in_progress', 'completed', 'partial', 'skipped');
create type public.execution_status as enum ('in_progress', 'completed', 'partial', 'skipped');
create type public.record_kind as enum ('running', 'strength', 'other');
create type public.goal_status as enum ('active', 'achieved', 'abandoned');
create type public.invite_status as enum ('pending', 'accepted', 'revoked');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- people
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  email       text,
  timezone    text not null default 'Europe/Warsaw',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.athlete_profiles (
  athlete_id    uuid primary key references public.profiles (id) on delete cascade,
  sport_goal    text check (char_length(sport_goal) <= 300),
  primary_sport text not null default 'running',
  birth_year    int check (birth_year between 1900 and 2100),
  height_cm     numeric(5,1) check (height_cm between 50 and 260),
  weight_kg     numeric(5,1) check (weight_kg between 20 and 300),
  resting_hr    int check (resting_hr between 25 and 120),
  max_hr        int check (max_hr between 100 and 240),
  lthr          int check (lthr between 80 and 230),
  easy_hr_max   int check (easy_hr_max between 80 and 230),
  athlete_notes text check (char_length(athlete_notes) <= 4000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger athlete_profiles_updated before update on public.athlete_profiles
  for each row execute function public.set_updated_at();

create table public.coach_athletes (
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  primary key (coach_id, athlete_id)
);
create index coach_athletes_athlete_idx on public.coach_athletes (athlete_id);

-- Private coach notes about an athlete. Never visible to the athlete.
create table public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 8000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index coach_notes_athlete_idx on public.coach_notes (coach_id, athlete_id, created_at desc);
create trigger coach_notes_updated before update on public.coach_notes
  for each row execute function public.set_updated_at();

-- Server-side switches (only reachable with the service role / SQL editor).
create table public.app_config (
  key   text primary key,
  value text not null
);
insert into public.app_config (key, value) values ('coach_signup', 'open');

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles (id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name    text check (char_length(full_name) <= 120),
  message      text check (char_length(message) <= 1000),
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  status       public.invite_status not null default 'pending',
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_by  uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index invitations_coach_idx on public.invitations (coach_id, status);
create unique index invitations_pending_email on public.invitations (coach_id, lower(email)) where status = 'pending';

-- ---------------------------------------------------------------- plans
create table public.training_plans (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 160),
  description text check (char_length(description) <= 4000),
  goal        text check (char_length(goal) <= 300),
  start_date  date not null,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index training_plans_athlete_idx on public.training_plans (athlete_id, start_date);
create trigger training_plans_updated before update on public.training_plans
  for each row execute function public.set_updated_at();

create table public.training_templates (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 160),
  description text check (char_length(description) <= 2000),
  kind        public.session_kind not null,
  category    text not null,
  -- The template body has a nested, kind-specific shape (segments or exercises with sets),
  -- so it is kept as JSONB. Sessions created from it are fully relational copies.
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index training_templates_coach_idx on public.training_templates (coach_id, kind);
create trigger training_templates_updated before update on public.training_templates
  for each row execute function public.set_updated_at();

create table public.training_sessions (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.profiles (id) on delete cascade,
  athlete_id      uuid not null references public.profiles (id) on delete cascade,
  plan_id         uuid references public.training_plans (id) on delete set null,
  template_id     uuid references public.training_templates (id) on delete set null,
  kind            public.session_kind not null,
  category        text not null check (category in (
                    'easy', 'recovery', 'long', 'tempo', 'threshold', 'intervals', 'fartlek', 'hills',
                    'progression', 'race_pace', 'test', 'race', 'custom_run',
                    'strength', 'power', 'circuit', 'mobility', 'motor_prep', 'other')),
  title           text not null check (char_length(title) between 1 and 160),
  scheduled_date  date not null,
  scheduled_time  time,
  goal            text check (char_length(goal) <= 500),
  instructions    text check (char_length(instructions) <= 8000),
  notes           text check (char_length(notes) <= 4000),
  planned_rpe     numeric(3,1) check (planned_rpe between 1 and 10),
  planned_duration_s int check (planned_duration_s between 0 and 86400),
  status          public.session_status not null default 'planned',
  version         int not null default 1,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index training_sessions_athlete_date_idx on public.training_sessions (athlete_id, scheduled_date);
create index training_sessions_coach_date_idx on public.training_sessions (coach_id, scheduled_date);
create index training_sessions_plan_idx on public.training_sessions (plan_id);

-- Running plan: one row per running session.
create table public.running_workouts (
  session_id         uuid primary key references public.training_sessions (id) on delete cascade,
  structure          text not null default 'continuous'
                       check (structure in ('continuous', 'intervals', 'fartlek', 'progression', 'custom')),
  planned_distance_m int check (planned_distance_m between 0 and 1000000),
  planned_duration_s int check (planned_duration_s between 0 and 172800),
  target_pace_min_s  int check (target_pace_min_s between 60 and 1800),   -- faster bound, s/km
  target_pace_max_s  int check (target_pace_max_s between 60 and 1800),   -- slower bound, s/km
  target_hr_min      int check (target_hr_min between 40 and 240),
  target_hr_max      int check (target_hr_max between 40 and 240),
  intensity_zone     text check (intensity_zone in ('Z1', 'Z2', 'Z3', 'Z4', 'Z5')),
  check (target_pace_min_s is null or target_pace_max_s is null or target_pace_min_s <= target_pace_max_s),
  check (target_hr_min is null or target_hr_max is null or target_hr_min <= target_hr_max)
);

-- Ordered blocks of a running session: warm-up, any number of different work bouts, recoveries, cool-down.
create table public.running_segments (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.training_sessions (id) on delete cascade,
  position            int not null,
  segment_type        text not null check (segment_type in ('warmup', 'work', 'recovery', 'steady', 'strides', 'cooldown')),
  label               text check (char_length(label) <= 120),
  repeats             int not null default 1 check (repeats between 1 and 100),
  distance_m          int check (distance_m between 1 and 200000),
  duration_s          int check (duration_s between 1 and 86400),
  target_pace_min_s   int check (target_pace_min_s between 60 and 1800),
  target_pace_max_s   int check (target_pace_max_s between 60 and 1800),
  target_hr_min       int check (target_hr_min between 40 and 240),
  target_hr_max       int check (target_hr_max between 40 and 240),
  intensity           text check (intensity in ('very_easy', 'easy', 'moderate', 'hard', 'very_hard', 'max')),
  recovery_type       text check (recovery_type in ('jog', 'walk', 'standing', 'easy')),
  recovery_duration_s int check (recovery_duration_s between 0 and 3600),
  recovery_distance_m int check (recovery_distance_m between 0 and 10000),
  notes               text check (char_length(notes) <= 1000)
);
create index running_segments_session_idx on public.running_segments (session_id, position);

create table public.strength_exercises (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.training_sessions (id) on delete cascade,
  position     int not null,
  name         text not null check (char_length(name) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  muscle_group text check (char_length(muscle_group) <= 60),
  rest_s       int check (rest_s between 0 and 1800),
  tempo        text check (char_length(tempo) <= 20),
  notes        text check (char_length(notes) <= 1000)
);
create index strength_exercises_session_idx on public.strength_exercises (session_id, position);

create table public.strength_sets (
  id                 uuid primary key default gen_random_uuid(),
  exercise_id        uuid not null references public.strength_exercises (id) on delete cascade,
  position           int not null,
  planned_reps       int check (planned_reps between 0 and 1000),
  planned_load_kg    numeric(6,2) check (planned_load_kg between 0 and 1000),
  planned_duration_s int check (planned_duration_s between 0 and 3600),
  planned_rpe        numeric(3,1) check (planned_rpe between 1 and 10),
  planned_rir        int check (planned_rir between 0 and 10)
);
create index strength_sets_exercise_idx on public.strength_sets (exercise_id, position);

-- ---------------------------------------------------------------- execution
create table public.workout_executions (
  id            uuid primary key default gen_random_uuid(),
  -- restrict: a session with a recorded execution cannot be deleted, so history survives plan changes.
  session_id    uuid not null unique references public.training_sessions (id) on delete restrict,
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  status        public.execution_status not null default 'completed',
  performed_on  date not null default current_date,
  started_at    timestamptz,
  completed_at  timestamptz,
  rpe           numeric(3,1) check (rpe between 1 and 10),
  feeling       int check (feeling between 1 and 5),
  comment       text check (char_length(comment) <= 4000),
  plan_snapshot jsonb not null default '{}'::jsonb,
  plan_version  int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index workout_executions_athlete_idx on public.workout_executions (athlete_id, performed_on);
create trigger workout_executions_updated before update on public.workout_executions
  for each row execute function public.set_updated_at();

create table public.running_execution_results (
  execution_id      uuid primary key references public.workout_executions (id) on delete cascade,
  distance_m        int check (distance_m between 0 and 1000000),
  duration_s        int check (duration_s between 0 and 172800),
  avg_pace_s        int check (avg_pace_s between 60 and 3600),
  pace_is_manual    boolean not null default false,
  avg_hr            int check (avg_hr between 30 and 240),
  max_hr            int check (max_hr between 30 and 250),
  elevation_gain_m  int check (elevation_gain_m between 0 and 20000),
  cadence_spm       int check (cadence_spm between 60 and 260),
  conditions        text check (char_length(conditions) <= 300)
);

-- Optional per-rep results (e.g. each 800 m of 6x800 m).
create table public.running_lap_results (
  id            uuid primary key default gen_random_uuid(),
  execution_id  uuid not null references public.workout_executions (id) on delete cascade,
  segment_id    uuid references public.running_segments (id) on delete set null,
  position      int not null,
  rep_index     int not null default 1,
  distance_m    int check (distance_m between 0 and 200000),
  duration_s    int check (duration_s between 0 and 86400),
  avg_hr        int check (avg_hr between 30 and 240),
  notes         text check (char_length(notes) <= 300)
);
create index running_lap_results_exec_idx on public.running_lap_results (execution_id, position);

create table public.exercise_execution_results (
  id             uuid primary key default gen_random_uuid(),
  execution_id   uuid not null references public.workout_executions (id) on delete cascade,
  exercise_id    uuid references public.strength_exercises (id) on delete set null,
  exercise_name  text not null default '',
  position       int not null,
  status         text not null default 'done' check (status in ('done', 'partial', 'skipped', 'pending')),
  comment        text check (char_length(comment) <= 1000),
  unique (execution_id, exercise_id)
);
create index exercise_execution_results_exec_idx on public.exercise_execution_results (execution_id, position);
create index exercise_execution_results_name_idx on public.exercise_execution_results (lower(exercise_name));

create table public.set_execution_results (
  id                 uuid primary key default gen_random_uuid(),
  exercise_result_id uuid not null references public.exercise_execution_results (id) on delete cascade,
  set_id             uuid references public.strength_sets (id) on delete set null,
  position           int not null,
  reps               int check (reps between 0 and 1000),
  load_kg            numeric(6,2) check (load_kg between 0 and 1000),
  duration_s         int check (duration_s between 0 and 3600),
  rpe                numeric(3,1) check (rpe between 1 and 10),
  rir                int check (rir between 0 and 10),
  completed          boolean not null default true
);
create index set_execution_results_ex_idx on public.set_execution_results (exercise_result_id, position);

-- ---------------------------------------------------------------- feedback, records, goals, notifications
create table public.training_comments (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.training_sessions (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index training_comments_session_idx on public.training_comments (session_id, created_at);
create trigger training_comments_updated before update on public.training_comments
  for each row execute function public.set_updated_at();

create table public.personal_records (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  kind          public.record_kind not null,
  label         text not null check (char_length(label) between 1 and 120),
  distance_m    int check (distance_m between 1 and 1000000),
  exercise_name text check (char_length(exercise_name) <= 120),
  value         numeric(12,2) not null check (value >= 0),
  unit          text not null check (unit in ('s', 'kg', 'reps', 'm')),
  achieved_on   date not null,
  source        text not null default 'manual' check (source in ('manual', 'execution', 'race', 'test')),
  session_id    uuid references public.training_sessions (id) on delete set null,
  comment       text check (char_length(comment) <= 1000),
  confirmed     boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index personal_records_athlete_idx on public.personal_records (athlete_id, kind, label);

create table public.athlete_goals (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 160),
  description   text check (char_length(description) <= 2000),
  start_value   numeric(12,2),
  target_value  numeric(12,2),
  current_value numeric(12,2),
  unit          text check (char_length(unit) <= 20),
  lower_is_better boolean not null default false,
  deadline      date,
  status        public.goal_status not null default 'active',
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index athlete_goals_athlete_idx on public.athlete_goals (athlete_id, status);
create trigger athlete_goals_updated before update on public.athlete_goals
  for each row execute function public.set_updated_at();

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('session_assigned', 'session_rescheduled', 'session_updated', 'comment',
                                            'execution_logged', 'invite_accepted', 'reminder')),
  title       text not null,
  body        text,
  link        text,
  session_id  uuid references public.training_sessions (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
