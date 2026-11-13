-- VYRA · VYRA Method assistant: automatic comments on sessions, weekly summaries and a conversation.
-- Safe to run more than once. Needs 20261115000100_vyra_method.sql.
--
-- method_notes  everything the assistant wrote for a runner (and the runner's questions), in one feed.
--               kind: session (after a logged session), week (after the weekly check-in),
--                     welcome (first plan), chat_user / chat_assistant (conversation).

create table if not exists public.method_notes (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('session', 'week', 'welcome', 'chat_user', 'chat_assistant')),
  session_id  uuid references public.training_sessions (id) on delete cascade,
  week_id     uuid references public.method_weeks (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 6000),
  created_at  timestamptz not null default now()
);
create index if not exists method_notes_athlete_idx on public.method_notes (athlete_id, created_at desc);
create unique index if not exists method_notes_one_per_session on public.method_notes (session_id) where kind = 'session';
create unique index if not exists method_notes_one_per_week on public.method_notes (week_id) where kind = 'week';

alter table public.method_notes enable row level security;
drop policy if exists method_notes_select on public.method_notes;
drop policy if exists method_notes_insert on public.method_notes;
drop policy if exists method_notes_delete on public.method_notes;
create policy method_notes_select on public.method_notes for select to authenticated
  using (athlete_id = auth.uid() or public.is_active_coach_of(athlete_id));
-- Written by the app on the runner's behalf (their own session), only with Method access.
create policy method_notes_insert on public.method_notes for insert to authenticated
  with check (athlete_id = auth.uid() and public.has_method_access(auth.uid()));
create policy method_notes_delete on public.method_notes for delete to authenticated
  using (athlete_id = auth.uid());
grant select, insert, delete on public.method_notes to authenticated;
