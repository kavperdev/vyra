-- Self-planning athletes: a coach can let an athlete add, edit and delete their OWN sessions
-- (training diary). Sessions planned by staff stay read-only for the athlete.

alter table public.profiles add column if not exists self_planning boolean not null default false;

-- The athlete themself, with self-planning switched on by their coach.
create or replace function public.can_self_plan(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_athlete = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'athlete' and self_planning)
$$;

-- Session children (segments, exercises, sets): staff who plan for the athlete,
-- or the self-planning athlete for sessions they created themselves.
create or replace function public.can_manage_session(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select public.is_active_coach_of(athlete_id)
        or (public.can_self_plan(athlete_id) and created_by = auth.uid())
    from public.training_sessions where id = p_session), false)
$$;

drop policy if exists training_sessions_insert on public.training_sessions;
create policy training_sessions_insert on public.training_sessions for insert to authenticated
  with check (coach_id = auth.uid()
              and (public.is_active_coach_of(athlete_id) or public.can_self_plan(athlete_id)));

drop policy if exists training_sessions_update on public.training_sessions;
create policy training_sessions_update on public.training_sessions for update to authenticated
  using (public.is_active_coach_of(athlete_id) or (public.can_self_plan(athlete_id) and created_by = auth.uid()))
  with check (public.is_active_coach_of(athlete_id) or (public.can_self_plan(athlete_id) and created_by = auth.uid()));

drop policy if exists training_sessions_delete on public.training_sessions;
create policy training_sessions_delete on public.training_sessions for delete to authenticated
  using (public.is_active_coach_of(athlete_id) or (public.can_self_plan(athlete_id) and created_by = auth.uid()));

-- No "new session" notifications for what the athlete added themself.
create or replace function public.training_sessions_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('vyra.bulk', true), '') = 'on' then
    return null;
  end if;
  if new.created_by is not distinct from new.athlete_id and auth.uid() is not distinct from new.athlete_id then
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

-- Switched on and off by staff who plan for the athlete (never by the athlete).
create or replace function public.set_self_planning(p_athlete uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_coach_of(p_athlete) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.profiles set self_planning = coalesce(p_on, false) where id = p_athlete and role = 'athlete';
end $$;

revoke execute on function public.can_self_plan(uuid), public.set_self_planning(uuid, boolean) from public, anon;
grant execute on function public.can_self_plan(uuid), public.set_self_planning(uuid, boolean) to authenticated;
