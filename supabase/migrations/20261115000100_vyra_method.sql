-- VYRA · VYRA Method: a self-serve plan built by the coaches' method from the runner's own data.
-- Safe to run more than once.
--
-- method_profiles  questionnaire answers (incl. health data, kept only with a separate consent),
--                  the engine's assessment and its week-to-week state.
-- method_weeks     one row per generated week: the plan summary, the sessions it created and the
--                  runner's weekly check-in (fatigue, sleep, pain, test result).
-- Access: an active VYRA Method membership (bought online) or a grant from a founder (friends, tests).
-- Sessions themselves are ordinary self-planned sessions (save_session), so the calendar, execution
-- logging and statistics work unchanged.

alter table public.profiles add column if not exists method_access boolean not null default false;

create or replace function public.has_method_access(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select method_access from public.profiles where id = p_user), false)
      or exists (
        select 1 from public.memberships m
        join public.profiles p on lower(p.email) = lower(m.email)
        where p.id = p_user and m.status = 'active' and m.plan_name ilike '%method%'
          and (m.access_until is null or m.access_until >= current_date))
$$;

create table if not exists public.method_profiles (
  athlete_id        uuid primary key references public.profiles (id) on delete cascade,
  answers           jsonb not null,
  health_consent_at timestamptz not null,
  assessment        jsonb,
  state             jsonb,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (pg_column_size(answers) < 20000)
);
drop trigger if exists method_profiles_updated on public.method_profiles;
create trigger method_profiles_updated before update on public.method_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.method_weeks (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles (id) on delete cascade,
  week_start   date not null,
  idx          int not null check (idx between 1 and 520),
  plan         jsonb not null default '{}'::jsonb,
  session_ids  uuid[] not null default '{}',
  checkin      jsonb,
  created_at   timestamptz not null default now(),
  unique (athlete_id, week_start),
  check (extract(isodow from week_start) = 1),
  check (pg_column_size(plan) < 60000),
  check (checkin is null or pg_column_size(checkin) < 4000)
);
create index if not exists method_weeks_athlete_idx on public.method_weeks (athlete_id, week_start desc);

alter table public.method_profiles enable row level security;
alter table public.method_weeks enable row level security;

drop policy if exists method_profiles_select on public.method_profiles;
drop policy if exists method_profiles_insert on public.method_profiles;
drop policy if exists method_profiles_update on public.method_profiles;
drop policy if exists method_profiles_delete on public.method_profiles;
-- The runner reads their own; the coaches who look after them may read it too (escalation "Zapytaj trenera").
create policy method_profiles_select on public.method_profiles for select to authenticated
  using (athlete_id = auth.uid() or public.is_active_coach_of(athlete_id));
create policy method_profiles_insert on public.method_profiles for insert to authenticated
  with check (athlete_id = auth.uid() and public.has_method_access(auth.uid()));
create policy method_profiles_update on public.method_profiles for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
-- Withdrawing consent deletes the answers (RODO); sessions already in the calendar stay.
create policy method_profiles_delete on public.method_profiles for delete to authenticated
  using (athlete_id = auth.uid());

drop policy if exists method_weeks_select on public.method_weeks;
drop policy if exists method_weeks_insert on public.method_weeks;
drop policy if exists method_weeks_update on public.method_weeks;
drop policy if exists method_weeks_delete on public.method_weeks;
create policy method_weeks_select on public.method_weeks for select to authenticated
  using (athlete_id = auth.uid() or public.is_active_coach_of(athlete_id));
create policy method_weeks_insert on public.method_weeks for insert to authenticated
  with check (athlete_id = auth.uid() and public.has_method_access(auth.uid()));
create policy method_weeks_update on public.method_weeks for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy method_weeks_delete on public.method_weeks for delete to authenticated
  using (athlete_id = auth.uid());

grant select, insert, update, delete on public.method_profiles, public.method_weeks to authenticated;

-- The runner switches on self-planning for themself, only with Method access: the engine then saves
-- the generated sessions through save_session like any self-planned session.
create or replace function public.method_enable() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_method_access(auth.uid()) then
    return false;
  end if;
  update public.profiles set self_planning = true where id = auth.uid() and role = 'athlete';
  return found;
end $$;

-- Founders grant Method for free (friends, testers, partners).
create or replace function public.set_method_access(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.profiles set method_access = coalesce(p_on, false) where id = p_user;
end $$;

revoke execute on function public.has_method_access(uuid), public.method_enable(), public.set_method_access(uuid, boolean) from public, anon;
grant execute on function public.has_method_access(uuid), public.method_enable(), public.set_method_access(uuid, boolean) to authenticated;

-- Packages: sold on /metoda, hidden from the coaching list on /prowadzenie (filtered by name).
-- Visible right away: /metoda sells them as soon as online payments work (hide them in the panel to pause sales).
insert into public.coaching_plans (name, tagline, kind, price_pln, commit_price_pln, features, badge, highlighted, visible, sort)
select 'VYRA Method', 'Plan z metody trenerów VYRA, dopasowany do Twoich danych i aktualizowany co tydzień.', 'monthly', 29, null,
  E'Plan na każdy tydzień z Twoich danych: wiek, waga, forma, czas\nTempa i tętno przeliczane po każdym teście\nLżejsze tygodnie i ochrona przed przeciążeniem\nCotygodniowa ankieta, po której plan się dopasowuje\nAplikacja VYRA na telefonie',
  null, false, true, 60
where not exists (select 1 from public.coaching_plans where name = 'VYRA Method');

insert into public.coaching_plans (name, tagline, kind, price_pln, commit_price_pln, features, badge, highlighted, visible, sort)
select 'VYRA Method · rok', 'Rok planu VYRA Method w jednej płatności: dwa miesiące gratis.', 'once', 199, null,
  E'Wszystko z VYRA Method przez 12 miesięcy\nJedna płatność, bez odnawiania\nCena jak za ok. 7 miesięcy',
  'Najtaniej', true, true, 61
where not exists (select 1 from public.coaching_plans where name = 'VYRA Method · rok');

-- Sales open: also for databases where an earlier version of this file added them hidden.
update public.coaching_plans set visible = true where name in ('VYRA Method', 'VYRA Method · rok') and not visible;
