-- Sport clubs on the VYRA platform: a club space (name, logo), club staff, athletes without an
-- account (managed by the coach, e.g. children), coach-logged results for them, and group attendance.

-- ---------------------------------------------------------------- clubs
create table if not exists public.sport_clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 120),
  city        text check (char_length(city) <= 80),
  logo_url    text check (char_length(logo_url) <= 500),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists club_id uuid references public.sport_clubs (id) on delete set null;
alter table public.profiles add column if not exists managed boolean not null default false;
alter table public.invitations add column if not exists club_id uuid references public.sport_clubs (id) on delete set null;
create index if not exists profiles_club_idx on public.profiles (club_id) where club_id is not null;

create or replace function public.my_club_id() returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.profiles where id = auth.uid()
$$;

alter table public.sport_clubs enable row level security;
drop policy if exists sport_clubs_select on public.sport_clubs;
drop policy if exists sport_clubs_insert on public.sport_clubs;
drop policy if exists sport_clubs_update on public.sport_clubs;
drop policy if exists sport_clubs_delete on public.sport_clubs;
create policy sport_clubs_select on public.sport_clubs for select to authenticated
  using (public.is_founder() or id = public.my_club_id());
create policy sport_clubs_insert on public.sport_clubs for insert to authenticated
  with check (public.is_founder());
create policy sport_clubs_update on public.sport_clubs for update to authenticated
  using (public.is_founder() or (id = public.my_club_id() and public.is_coach()))
  with check (public.is_founder() or (id = public.my_club_id() and public.is_coach()));
create policy sport_clubs_delete on public.sport_clubs for delete to authenticated
  using (public.is_founder());
grant select, insert, update, delete on public.sport_clubs to authenticated;

-- Only founders put someone into a club (or move them out).
create or replace function public.set_member_club(p_member uuid, p_club uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.profiles set club_id = p_club where id = p_member;
end $$;

-- Staff invitations may carry a club; athlete invitations inherit the inviting coach's club.
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated
  with check (coach_id = auth.uid() and public.is_coach() and status = 'pending'
              and ((staff_role is null and club_id is null) or public.is_founder()));

-- ---------------------------------------------------------------- sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_token text := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_inv   public.invitations;
  v_role  text;
  v_club  uuid;
begin
  -- Athletes without an account are created by create_managed_athlete(), which sets this flag itself.
  if coalesce(current_setting('vyra.managed_user', true), '') = new.id::text then
    return new;
  end if;
  if v_token is not null then
    select * into v_inv from public.invitations where token = v_token for update;
    if not found or v_inv.status <> 'pending' or v_inv.expires_at < now() then
      raise exception 'INVITE_INVALID' using errcode = 'P0001';
    end if;
    if lower(v_inv.email) <> lower(coalesce(new.email, '')) then
      raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001';
    end if;

    if v_inv.staff_role is not null then
      -- Staff member joining the VYRA team.
      insert into public.profiles (id, role, staff_role, full_name, email, club_id)
        values (new.id, 'coach', v_inv.staff_role, coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email, v_inv.club_id);
      if v_inv.staff_role = 'founder' then
        insert into public.coach_athletes (coach_id, athlete_id)
          select new.id, id from public.profiles where role = 'athlete' on conflict do nothing;
      end if;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu VYRA', null, '/coach/team', null);
    else
      -- Athlete joining a coach.
      v_club := coalesce(v_inv.club_id, (select club_id from public.profiles where id = v_inv.coach_id));
      insert into public.profiles (id, role, full_name, email, club_id)
        values (new.id, 'athlete', coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email, v_club);
      insert into public.athlete_profiles (athlete_id) values (new.id);
      insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, new.id) on conflict do nothing;
      insert into public.coach_athletes (coach_id, athlete_id)
        select id, new.id from public.profiles where staff_role = 'founder' on conflict do nothing;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu', null,
        '/coach/athletes/' || new.id, null);
    end if;
  else
    if coalesce((select value from public.app_config where key = 'coach_signup'), 'open') <> 'open' then
      raise exception 'COACH_SIGNUP_CLOSED' using errcode = 'P0001';
    end if;
    -- The very first account founds VYRA; later open sign-ups are independent coaches.
    v_role := case when exists (select 1 from public.profiles where staff_role = 'founder')
                   then 'running_coach' else 'founder' end;
    insert into public.profiles (id, role, staff_role, full_name, email)
      values (new.id, 'coach', v_role, coalesce(v_name, split_part(new.email, '@', 1)), new.email);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- athletes without an account
create or replace function public.create_managed_athlete(p_name text, p_birth_year int default null) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id   uuid := gen_random_uuid();
  v_name text := trim(coalesce(p_name, ''));
  v_has_aud boolean;
begin
  if not public.can_plan() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'NAME_INVALID' using errcode = 'P0001';
  end if;
  -- A login-less auth user, so the athlete fits everywhere an athlete profile is expected.
  perform set_config('vyra.managed_user', v_id::text, true);
  select exists (select 1 from information_schema.columns
                 where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') into v_has_aud;
  if v_has_aud then
    execute 'insert into auth.users (id, aud, role, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
             values ($1, ''authenticated'', ''authenticated'', $2, ''{"provider":"managed"}''::jsonb, now(), now())'
      using v_id, jsonb_build_object('full_name', v_name, 'managed', true);
  else
    insert into auth.users (id, raw_user_meta_data) values (v_id, jsonb_build_object('full_name', v_name, 'managed', true));
  end if;
  perform set_config('vyra.managed_user', '', true);

  insert into public.profiles (id, role, full_name, managed, club_id)
    values (v_id, 'athlete', v_name, true, public.my_club_id());
  insert into public.athlete_profiles (athlete_id, birth_year)
    values (v_id, case when p_birth_year between 1930 and 2030 then p_birth_year end);
  insert into public.coach_athletes (coach_id, athlete_id) values (auth.uid(), v_id) on conflict do nothing;
  insert into public.coach_athletes (coach_id, athlete_id)
    select id, v_id from public.profiles where staff_role = 'founder' on conflict do nothing;
  return v_id;
end $$;

-- The athlete themself, or planning staff for an athlete without an account.
create or replace function public.can_log_for(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_athlete = auth.uid()
      or (public.is_active_coach_of(p_athlete)
          and exists (select 1 from public.profiles where id = p_athlete and managed))
$$;

create or replace function public.owns_execution(p_execution uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workout_executions
                 where id = p_execution and public.can_log_for(athlete_id))
$$;

drop policy if exists workout_executions_insert on public.workout_executions;
drop policy if exists workout_executions_update on public.workout_executions;
drop policy if exists workout_executions_delete on public.workout_executions;
create policy workout_executions_insert on public.workout_executions for insert to authenticated
  with check (public.can_log_for(athlete_id)
              and exists (select 1 from public.training_sessions s where s.id = session_id and s.athlete_id = workout_executions.athlete_id));
create policy workout_executions_update on public.workout_executions for update to authenticated
  using (public.can_log_for(athlete_id)) with check (public.can_log_for(athlete_id));
create policy workout_executions_delete on public.workout_executions for delete to authenticated
  using (public.can_log_for(athlete_id));

-- Results: the athlete, or the coach for a managed athlete (p.athlete_id).
create or replace function public.save_execution(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_session uuid := (p ->> 'session_id')::uuid;
  v_exec    uuid;
  v_r       jsonb := p -> 'running';
  v_lap     jsonb;
  v_ex      jsonb;
  v_set     jsonb;
  v_pos     int := 0;
  v_spos    int;
  v_res     uuid;
  v_pace    int;
  v_athlete uuid := coalesce(nullif(p ->> 'athlete_id', '')::uuid, auth.uid());
begin
  -- A coach may log results for an athlete without an account (managed athlete).
  if not public.can_log_for(v_athlete) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.workout_executions as w (session_id, athlete_id, status, performed_on, rpe, feeling, comment, started_at)
  values (v_session, v_athlete, (p ->> 'status')::public.execution_status,
          coalesce(nullif(p ->> 'performed_on', '')::date, current_date), _num(p, 'rpe'), _int(p, 'feeling'),
          _txt(p, 'comment'), now())
  on conflict (session_id) do update set
    status = excluded.status, performed_on = excluded.performed_on, rpe = excluded.rpe,
    feeling = excluded.feeling, comment = excluded.comment
  returning id into v_exec;

  if v_r is not null and jsonb_typeof(v_r) = 'object' then
    -- Pace is derived from distance and time unless the athlete deliberately overrides it.
    v_pace := case
      when coalesce((v_r ->> 'pace_is_manual')::boolean, false) then _int(v_r, 'avg_pace_s')
      when _int(v_r, 'distance_m') > 0 and _int(v_r, 'duration_s') > 0
        then round(_int(v_r, 'duration_s') / (_int(v_r, 'distance_m') / 1000.0))::int
      else _int(v_r, 'avg_pace_s') end;
    insert into public.running_execution_results as r (execution_id, distance_m, duration_s, avg_pace_s, pace_is_manual,
      avg_hr, max_hr, elevation_gain_m, cadence_spm, conditions)
    values (v_exec, _int(v_r, 'distance_m'), _int(v_r, 'duration_s'),
      case when v_pace between 60 and 3600 then v_pace end,
      coalesce((v_r ->> 'pace_is_manual')::boolean, false), _int(v_r, 'avg_hr'), _int(v_r, 'max_hr'),
      _int(v_r, 'elevation_gain_m'), _int(v_r, 'cadence_spm'), _txt(v_r, 'conditions'))
    on conflict (execution_id) do update set
      distance_m = excluded.distance_m, duration_s = excluded.duration_s, avg_pace_s = excluded.avg_pace_s,
      pace_is_manual = excluded.pace_is_manual, avg_hr = excluded.avg_hr, max_hr = excluded.max_hr,
      elevation_gain_m = excluded.elevation_gain_m, cadence_spm = excluded.cadence_spm, conditions = excluded.conditions;
  end if;

  if p ? 'laps' then
    delete from public.running_lap_results where execution_id = v_exec;
    for v_lap in select * from jsonb_array_elements(coalesce(p -> 'laps', '[]'::jsonb)) loop
      v_pos := v_pos + 1;
      if _int(v_lap, 'distance_m') is null and _int(v_lap, 'duration_s') is null and _int(v_lap, 'avg_hr') is null then
        continue;
      end if;
      insert into public.running_lap_results (execution_id, segment_id, position, rep_index, distance_m, duration_s, avg_hr, notes)
      values (v_exec, nullif(v_lap ->> 'segment_id', '')::uuid, v_pos, coalesce(_int(v_lap, 'rep_index'), 1),
        _int(v_lap, 'distance_m'), _int(v_lap, 'duration_s'), _int(v_lap, 'avg_hr'), _txt(v_lap, 'notes'));
    end loop;
  end if;

  if p ? 'exercises' then
    delete from public.exercise_execution_results where execution_id = v_exec;
    v_pos := 0;
    for v_ex in select * from jsonb_array_elements(coalesce(p -> 'exercises', '[]'::jsonb)) loop
      v_pos := v_pos + 1;
      insert into public.exercise_execution_results (execution_id, exercise_id, exercise_name, position, status, comment)
      values (v_exec, nullif(v_ex ->> 'exercise_id', '')::uuid, coalesce(_txt(v_ex, 'exercise_name'), ''), v_pos,
        coalesce(_txt(v_ex, 'status'), 'done'), _txt(v_ex, 'comment'))
      returning id into v_res;
      v_spos := 0;
      for v_set in select * from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]'::jsonb)) loop
        v_spos := v_spos + 1;
        insert into public.set_execution_results (exercise_result_id, set_id, position, reps, load_kg, duration_s, rpe, rir, completed)
        values (v_res, nullif(v_set ->> 'set_id', '')::uuid, v_spos, _int(v_set, 'reps'), _num(v_set, 'load_kg'),
          _int(v_set, 'duration_s'), _num(v_set, 'rpe'), _int(v_set, 'rir'),
          coalesce((v_set ->> 'completed')::boolean, true));
      end loop;
    end loop;
  end if;

  return v_exec;
end $$;

-- ---------------------------------------------------------------- group attendance
create table if not exists public.session_attendance (
  session_id  uuid primary key references public.training_sessions (id) on delete cascade,
  present     boolean not null,
  marked_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  marked_at   timestamptz not null default now()
);
alter table public.session_attendance enable row level security;

create or replace function public.coaches_session(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.is_active_coach_of(athlete_id) from public.training_sessions where id = p_session), false)
$$;

drop policy if exists session_attendance_select on public.session_attendance;
drop policy if exists session_attendance_write on public.session_attendance;
create policy session_attendance_select on public.session_attendance for select to authenticated
  using (public.can_view_session(session_id));
create policy session_attendance_write on public.session_attendance for all to authenticated
  using (public.coaches_session(session_id)) with check (public.coaches_session(session_id));
grant select, insert, update, delete on public.session_attendance to authenticated;

revoke execute on function public.my_club_id(), public.set_member_club(uuid, uuid), public.create_managed_athlete(text, int),
  public.can_log_for(uuid), public.coaches_session(uuid) from public, anon;
grant execute on function public.my_club_id(), public.set_member_club(uuid, uuid), public.create_managed_athlete(text, int),
  public.can_log_for(uuid), public.coaches_session(uuid) to authenticated;
