-- VYRA · The coach assistant learns from the coach: ratings and corrections of its analyses and suggestions.
-- Also allows a longer coach method (the full VYRA method is ~14 000 characters). Safe to run more than once.

alter table public.coach_methods drop constraint if exists coach_methods_body_check;
alter table public.coach_methods add constraint coach_methods_body_check check (char_length(body) <= 20000);

create table if not exists public.assistant_feedback (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  insight_id  uuid references public.coach_insights (id) on delete set null,
  -- null = the analysis as a whole, otherwise the index of the suggested session
  suggestion  smallint check (suggestion between 0 and 20),
  verdict     text not null check (verdict in ('good', 'bad')),
  note        text check (char_length(note) <= 1000),
  -- a general lesson applies to every athlete of this coach, not only this one
  general     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists assistant_feedback_coach_idx on public.assistant_feedback (coach_id, created_at desc);
create index if not exists assistant_feedback_athlete_idx on public.assistant_feedback (athlete_id, created_at desc);

alter table public.assistant_feedback enable row level security;
revoke all on public.assistant_feedback from anon, authenticated;
grant select, insert, delete on public.assistant_feedback to authenticated;
drop policy if exists assistant_feedback_own on public.assistant_feedback;
create policy assistant_feedback_own on public.assistant_feedback for all to authenticated
  using (coach_id = auth.uid() and public.is_coach())
  with check (coach_id = auth.uid() and public.is_coach() and public.is_coach_of(athlete_id));
