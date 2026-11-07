-- VYRA · Injury history: what, where, when, status, what triggers it and what the plan must respect.
-- Read by the athlete and all their coaches (incl. physio); written by the athlete and any linked coach or physio.
-- Safe to run more than once.

create table if not exists public.athlete_injuries (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  area          text not null check (area in (
                  'stopa', 'pieta_achilles', 'lydka', 'piszczel', 'kolano', 'udo_przod', 'udo_tyl',
                  'biodro_pachwina', 'posladek', 'pasmo_bt', 'plecy_ledzwia', 'kostka', 'inne')),
  side          text check (side in ('lewa', 'prawa', 'obie')),
  name          text not null check (char_length(name) between 2 and 160),
  status        text not null default 'active' check (status in ('active', 'healing', 'healed', 'recurring')),
  severity      smallint not null default 2 check (severity between 1 and 3),
  started_on    date,
  ended_on      date,
  triggers      text check (char_length(triggers) <= 1000),
  restrictions  text check (char_length(restrictions) <= 1000),
  helps         text check (char_length(helps) <= 1000),
  notes         text check (char_length(notes) <= 2000),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);
create index if not exists athlete_injuries_athlete_idx on public.athlete_injuries (athlete_id, status);
drop trigger if exists athlete_injuries_updated on public.athlete_injuries;
create trigger athlete_injuries_updated before update on public.athlete_injuries
  for each row execute function public.set_updated_at();

alter table public.athlete_injuries enable row level security;
revoke all on public.athlete_injuries from anon, authenticated;
grant select, insert, update, delete on public.athlete_injuries to authenticated;

drop policy if exists athlete_injuries_read on public.athlete_injuries;
create policy athlete_injuries_read on public.athlete_injuries for select to authenticated
  using (public.can_view_athlete(athlete_id));

-- The athlete, or any linked staff member (coach or physio) with an active link.
drop policy if exists athlete_injuries_write on public.athlete_injuries;
create policy athlete_injuries_write on public.athlete_injuries for all to authenticated
  using (athlete_id = auth.uid() or (public.is_coach() and exists (
    select 1 from public.coach_athletes ca where ca.coach_id = auth.uid() and ca.athlete_id = athlete_injuries.athlete_id and ca.status = 'active')))
  with check (athlete_id = auth.uid() or (public.is_coach() and exists (
    select 1 from public.coach_athletes ca where ca.coach_id = auth.uid() and ca.athlete_id = athlete_injuries.athlete_id and ca.status = 'active')));
