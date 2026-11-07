-- VYRA · Main race and the coach's own method for the coach assistant. Safe to run more than once.

-- 1. One goal can be marked as the main race (A start): the plan, phase and countdown follow it.
alter table public.athlete_goals add column if not exists is_main boolean not null default false;
create unique index if not exists athlete_goals_one_main on public.athlete_goals (athlete_id) where is_main;

-- 2. "Moja metoda": the coaching principles the assistant follows, one text per coach.
create table if not exists public.coach_methods (
  coach_id   uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  body       text not null default '' check (char_length(body) <= 6000),
  updated_at timestamptz not null default now()
);
alter table public.coach_methods enable row level security;
revoke all on public.coach_methods from anon, authenticated;
grant select, insert, update on public.coach_methods to authenticated;
drop policy if exists coach_methods_own on public.coach_methods;
create policy coach_methods_own on public.coach_methods for all to authenticated
  using (coach_id = auth.uid() and public.is_coach())
  with check (coach_id = auth.uid() and public.is_coach());
-- Founders' method is the team default: other coaches may read it when they have none of their own.
drop policy if exists coach_methods_team_read on public.coach_methods;
create policy coach_methods_team_read on public.coach_methods for select to authenticated
  using (public.is_coach() and exists (select 1 from public.profiles p where p.id = coach_id and p.staff_role = 'founder'));
