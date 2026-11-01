-- VYRA · onboarding questionnaire (ankieta startowa). Safe to run more than once.

alter table public.athlete_profiles
  add column if not exists intake jsonb,
  add column if not exists intake_done_at timestamptz;

alter table public.athlete_profiles drop constraint if exists athlete_profiles_intake_size;
alter table public.athlete_profiles add constraint athlete_profiles_intake_size
  check (intake is null or pg_column_size(intake) <= 20000);

-- The coach gets a notification when an athlete sends the questionnaire for the first time.
create or replace function public.notify_intake_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name  text;
  v_coach uuid;
begin
  if new.intake_done_at is null or old.intake_done_at is not null then return new; end if;
  select coalesce(nullif(full_name, ''), email) into v_name from public.profiles where id = new.athlete_id;
  for v_coach in select coach_id from public.coach_athletes where athlete_id = new.athlete_id and status = 'active' loop
    perform public.notify(v_coach, 'reminder', 'Ankieta startowa: ' || coalesce(v_name, 'zawodnik'),
      coalesce(new.intake ->> 'goal', 'Zawodnik wypełnił ankietę startową.'),
      '/coach/athletes/' || new.athlete_id, null);
  end loop;
  return new;
end $$;
revoke execute on function public.notify_intake_done() from public, anon, authenticated;

drop trigger if exists athlete_profiles_intake_notify on public.athlete_profiles;
create trigger athlete_profiles_intake_notify after update of intake_done_at on public.athlete_profiles
  for each row execute function public.notify_intake_done();
