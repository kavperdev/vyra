-- VYRA · morning readiness check-in: sleep, energy, soreness and pain, once a day per athlete

create table if not exists public.readiness (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  sleep       smallint not null check (sleep between 1 and 5),
  energy      smallint not null check (energy between 1 and 5),
  soreness    smallint not null check (soreness between 1 and 5),
  pain        boolean not null default false,
  pain_area   text check (char_length(pain_area) <= 80),
  note        text check (char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  unique (athlete_id, day)
);
create index if not exists readiness_day_idx on public.readiness (day, athlete_id);

alter table public.readiness enable row level security;
drop policy if exists readiness_select on public.readiness;
drop policy if exists readiness_own_write on public.readiness;
create policy readiness_select on public.readiness for select to authenticated
  using (athlete_id = auth.uid() or public.can_view_athlete(athlete_id));
create policy readiness_own_write on public.readiness for all to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
grant select, insert, update, delete on public.readiness to authenticated;
