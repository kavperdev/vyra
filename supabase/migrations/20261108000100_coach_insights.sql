-- VYRA · Coach assistant: automatic analysis of an athlete and suggested next sessions.
-- Visible only to the athlete's coaches (never to the athlete). Safe to run more than once.

create table if not exists public.coach_insights (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  model       text check (char_length(model) <= 80),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists coach_insights_athlete_idx on public.coach_insights (athlete_id, created_at desc);

alter table public.coach_insights enable row level security;
revoke all on public.coach_insights from anon, authenticated;
grant select, insert, delete on public.coach_insights to authenticated;

drop policy if exists coach_insights_read on public.coach_insights;
create policy coach_insights_read on public.coach_insights for select to authenticated
  using (public.is_coach() and public.is_coach_of(athlete_id));

drop policy if exists coach_insights_insert on public.coach_insights;
create policy coach_insights_insert on public.coach_insights for insert to authenticated
  with check (public.is_coach() and public.is_coach_of(athlete_id) and created_by = auth.uid());

drop policy if exists coach_insights_delete on public.coach_insights;
create policy coach_insights_delete on public.coach_insights for delete to authenticated
  using (public.is_coach() and public.is_coach_of(athlete_id));
