-- VYRA · copy a whole training week (to the next week or to another athlete) with one notification

-- Bulk operations set vyra.bulk for the transaction, so the per-session "Nowy trening" notifications
-- are skipped and the athlete gets a single summary instead.
create or replace function public.training_sessions_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('vyra.bulk', true), '') = 'on' then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.notify(new.athlete_id, 'session_assigned', 'Nowy trening: ' || new.title,
      to_char(new.scheduled_date, 'DD.MM.YYYY'), '/athlete/sessions/' || new.id, new.id);
  elsif new.scheduled_date is distinct from old.scheduled_date then
    perform public.notify(new.athlete_id, 'session_rescheduled', 'Zmiana terminu: ' || new.title,
      to_char(old.scheduled_date, 'DD.MM') || ' → ' || to_char(new.scheduled_date, 'DD.MM.YYYY'),
      '/athlete/sessions/' || new.id, new.id);
  elsif new.version > old.version and new.status = 'planned' then
    perform public.notify(new.athlete_id, 'session_updated', 'Trener zmienił trening: ' || new.title,
      to_char(new.scheduled_date, 'DD.MM.YYYY'), '/athlete/sessions/' || new.id, new.id);
  end if;
  return null;
end $$;

-- One summary notification after a bulk copy. Only for an athlete the caller actually plans for.
create or replace function public.notify_week_planned(p_athlete uuid, p_week date, p_count int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_count <= 0 or not public.is_active_coach_of(p_athlete) then return; end if;
  perform public.notify(p_athlete, 'session_assigned', 'Nowy plan tygodnia',
    p_count || ' × trening · ' || to_char(p_week, 'DD.MM') || ' – ' || to_char(p_week + 6, 'DD.MM.YYYY'),
    '/athlete/calendar', null);
end $$;
revoke execute on function public.notify_week_planned(uuid, date, int) from public, anon;

-- Copies every session of the week starting p_from (Monday) to the week starting p_to,
-- for the same athlete or for p_target. Runs with the caller's rights, so RLS applies to every copy.
create or replace function public.copy_week(p_athlete uuid, p_from date, p_to date, p_target uuid default null)
returns int language plpgsql security invoker set search_path = public as $$
declare
  v_target uuid := coalesce(p_target, p_athlete);
  v_shift  int := p_to - p_from;
  v_n      int := 0;
  v_s      record;
begin
  if extract(isodow from p_from) <> 1 or extract(isodow from p_to) <> 1 then
    raise exception 'WEEK_MUST_START_ON_MONDAY' using errcode = '22023';
  end if;
  if v_target = p_athlete and v_shift = 0 then
    raise exception 'SAME_WEEK' using errcode = '22023';
  end if;
  perform set_config('vyra.bulk', 'on', true);
  for v_s in
    select id, scheduled_date from public.training_sessions
    where athlete_id = p_athlete and scheduled_date between p_from and p_from + 6
    order by scheduled_date, scheduled_time nulls last, created_at
  loop
    perform public.copy_session(v_s.id, v_s.scheduled_date + v_shift, v_target);
    v_n := v_n + 1;
  end loop;
  perform set_config('vyra.bulk', '', true);
  perform public.notify_week_planned(v_target, p_to, v_n);
  return v_n;
end $$;
grant execute on function public.notify_week_planned(uuid, date, int) to authenticated;
grant execute on function public.copy_week(uuid, date, date, uuid) to authenticated;
