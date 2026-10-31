-- VYRA · transactional write functions.
-- All functions run as SECURITY INVOKER, so every statement inside is checked by RLS
-- exactly as if the client had issued it. They exist to make multi-table writes atomic.

-- ================================================================ helpers
create or replace function public._int(p jsonb, k text) returns int language sql immutable as $$
  select nullif(p ->> k, '')::numeric::int
$$;
create or replace function public._num(p jsonb, k text) returns numeric language sql immutable as $$
  select nullif(p ->> k, '')::numeric
$$;
create or replace function public._txt(p jsonb, k text) returns text language sql immutable as $$
  select nullif(trim(p ->> k), '')
$$;

-- ================================================================ plan: create / update one session
-- p = {
--   id?, athlete_id, plan_id?, template_id?, kind, category, title, scheduled_date, scheduled_time?,
--   goal?, instructions?, notes?, planned_rpe?, planned_duration_s?,
--   running?: { structure, planned_distance_m, planned_duration_s, target_pace_min_s, target_pace_max_s,
--               target_hr_min, target_hr_max, intensity_zone },
--   segments?: [ { id?, segment_type, label, repeats, distance_m, duration_s, target_pace_min_s, target_pace_max_s,
--                  target_hr_min, target_hr_max, intensity, recovery_type, recovery_duration_s,
--                  recovery_distance_m, notes } ],
--   exercises?: [ { id?, name, description, muscle_group, rest_s, tempo, notes,
--                   sets: [ { id?, planned_reps, planned_load_kg, planned_duration_s, planned_rpe, planned_rir } ] } ]
-- }
create or replace function public.save_session(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id        uuid := nullif(p ->> 'id', '')::uuid;
  v_kind      public.session_kind := (p ->> 'kind')::public.session_kind;
  v_seg       jsonb;
  v_ex        jsonb;
  v_set       jsonb;
  v_pos       int;
  v_spos      int;
  v_ex_id     uuid;
  v_keep_seg  uuid[] := '{}';
  v_keep_ex   uuid[] := '{}';
  v_keep_set  uuid[];
  v_new_id    uuid;
begin
  if v_id is null then
    insert into public.training_sessions (coach_id, athlete_id, plan_id, template_id, kind, category, title,
      scheduled_date, scheduled_time, goal, instructions, notes, planned_rpe, planned_duration_s)
    values (auth.uid(), (p ->> 'athlete_id')::uuid, nullif(p ->> 'plan_id', '')::uuid, nullif(p ->> 'template_id', '')::uuid,
      v_kind, p ->> 'category', trim(p ->> 'title'), (p ->> 'scheduled_date')::date, nullif(p ->> 'scheduled_time', '')::time,
      _txt(p, 'goal'), _txt(p, 'instructions'), _txt(p, 'notes'), _num(p, 'planned_rpe'), _int(p, 'planned_duration_s'))
    returning id into v_id;
  else
    update public.training_sessions set
      plan_id = nullif(p ->> 'plan_id', '')::uuid, kind = v_kind, category = p ->> 'category',
      title = trim(p ->> 'title'), scheduled_date = (p ->> 'scheduled_date')::date,
      scheduled_time = nullif(p ->> 'scheduled_time', '')::time, goal = _txt(p, 'goal'),
      instructions = _txt(p, 'instructions'), notes = _txt(p, 'notes'),
      planned_rpe = _num(p, 'planned_rpe'), planned_duration_s = _int(p, 'planned_duration_s')
    where id = v_id;
    if not found then raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  -- running part
  if v_kind = 'running' and p ? 'running' then
    insert into public.running_workouts as r (session_id, structure, planned_distance_m, planned_duration_s,
      target_pace_min_s, target_pace_max_s, target_hr_min, target_hr_max, intensity_zone)
    values (v_id, coalesce(_txt(p -> 'running', 'structure'), 'continuous'), _int(p -> 'running', 'planned_distance_m'),
      _int(p -> 'running', 'planned_duration_s'), _int(p -> 'running', 'target_pace_min_s'),
      _int(p -> 'running', 'target_pace_max_s'), _int(p -> 'running', 'target_hr_min'),
      _int(p -> 'running', 'target_hr_max'), _txt(p -> 'running', 'intensity_zone'))
    on conflict (session_id) do update set
      structure = excluded.structure, planned_distance_m = excluded.planned_distance_m,
      planned_duration_s = excluded.planned_duration_s, target_pace_min_s = excluded.target_pace_min_s,
      target_pace_max_s = excluded.target_pace_max_s, target_hr_min = excluded.target_hr_min,
      target_hr_max = excluded.target_hr_max, intensity_zone = excluded.intensity_zone;
  elsif v_kind <> 'running' then
    delete from public.running_workouts where session_id = v_id;
  end if;

  -- segments (diffed by id so lap results stay linked)
  if v_kind = 'running' then
    v_pos := 0;
    for v_seg in select * from jsonb_array_elements(coalesce(p -> 'segments', '[]'::jsonb)) loop
      v_pos := v_pos + 1;
      if nullif(v_seg ->> 'id', '') is not null
         and exists (select 1 from public.running_segments where id = (v_seg ->> 'id')::uuid and session_id = v_id) then
        update public.running_segments set position = v_pos, segment_type = v_seg ->> 'segment_type',
          label = _txt(v_seg, 'label'), repeats = coalesce(_int(v_seg, 'repeats'), 1),
          distance_m = _int(v_seg, 'distance_m'), duration_s = _int(v_seg, 'duration_s'),
          target_pace_min_s = _int(v_seg, 'target_pace_min_s'), target_pace_max_s = _int(v_seg, 'target_pace_max_s'),
          target_hr_min = _int(v_seg, 'target_hr_min'), target_hr_max = _int(v_seg, 'target_hr_max'),
          intensity = _txt(v_seg, 'intensity'), recovery_type = _txt(v_seg, 'recovery_type'),
          recovery_duration_s = _int(v_seg, 'recovery_duration_s'), recovery_distance_m = _int(v_seg, 'recovery_distance_m'),
          notes = _txt(v_seg, 'notes')
        where id = (v_seg ->> 'id')::uuid;
        v_keep_seg := v_keep_seg || (v_seg ->> 'id')::uuid;
      else
        insert into public.running_segments (session_id, position, segment_type, label, repeats, distance_m, duration_s,
          target_pace_min_s, target_pace_max_s, target_hr_min, target_hr_max, intensity, recovery_type,
          recovery_duration_s, recovery_distance_m, notes)
        values (v_id, v_pos, v_seg ->> 'segment_type', _txt(v_seg, 'label'), coalesce(_int(v_seg, 'repeats'), 1),
          _int(v_seg, 'distance_m'), _int(v_seg, 'duration_s'), _int(v_seg, 'target_pace_min_s'),
          _int(v_seg, 'target_pace_max_s'), _int(v_seg, 'target_hr_min'), _int(v_seg, 'target_hr_max'),
          _txt(v_seg, 'intensity'), _txt(v_seg, 'recovery_type'), _int(v_seg, 'recovery_duration_s'),
          _int(v_seg, 'recovery_distance_m'), _txt(v_seg, 'notes'))
        returning id into v_new_id;
        v_keep_seg := v_keep_seg || v_new_id;
      end if;
    end loop;
  end if;
  delete from public.running_segments where session_id = v_id and not (id = any (v_keep_seg));

  -- strength exercises and sets (diffed by id so set results stay linked)
  if v_kind in ('strength', 'mobility', 'other') then
    v_pos := 0;
    for v_ex in select * from jsonb_array_elements(coalesce(p -> 'exercises', '[]'::jsonb)) loop
      v_pos := v_pos + 1;
      v_ex_id := nullif(v_ex ->> 'id', '')::uuid;
      if v_ex_id is not null and exists (select 1 from public.strength_exercises where id = v_ex_id and session_id = v_id) then
        update public.strength_exercises set position = v_pos, name = trim(v_ex ->> 'name'),
          description = _txt(v_ex, 'description'), muscle_group = _txt(v_ex, 'muscle_group'),
          rest_s = _int(v_ex, 'rest_s'), tempo = _txt(v_ex, 'tempo'), notes = _txt(v_ex, 'notes')
        where id = v_ex_id;
      else
        insert into public.strength_exercises (session_id, position, name, description, muscle_group, rest_s, tempo, notes)
        values (v_id, v_pos, trim(v_ex ->> 'name'), _txt(v_ex, 'description'), _txt(v_ex, 'muscle_group'),
          _int(v_ex, 'rest_s'), _txt(v_ex, 'tempo'), _txt(v_ex, 'notes'))
        returning id into v_ex_id;
      end if;
      v_keep_ex := v_keep_ex || v_ex_id;

      v_keep_set := '{}';
      v_spos := 0;
      for v_set in select * from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]'::jsonb)) loop
        v_spos := v_spos + 1;
        if nullif(v_set ->> 'id', '') is not null
           and exists (select 1 from public.strength_sets where id = (v_set ->> 'id')::uuid and exercise_id = v_ex_id) then
          update public.strength_sets set position = v_spos, planned_reps = _int(v_set, 'planned_reps'),
            planned_load_kg = _num(v_set, 'planned_load_kg'), planned_duration_s = _int(v_set, 'planned_duration_s'),
            planned_rpe = _num(v_set, 'planned_rpe'), planned_rir = _int(v_set, 'planned_rir')
          where id = (v_set ->> 'id')::uuid;
          v_keep_set := v_keep_set || (v_set ->> 'id')::uuid;
        else
          insert into public.strength_sets (exercise_id, position, planned_reps, planned_load_kg, planned_duration_s,
            planned_rpe, planned_rir)
          values (v_ex_id, v_spos, _int(v_set, 'planned_reps'), _num(v_set, 'planned_load_kg'),
            _int(v_set, 'planned_duration_s'), _num(v_set, 'planned_rpe'), _int(v_set, 'planned_rir'))
          returning id into v_new_id;
          v_keep_set := v_keep_set || v_new_id;
        end if;
      end loop;
      delete from public.strength_sets where exercise_id = v_ex_id and not (id = any (v_keep_set));
    end loop;
  end if;
  delete from public.strength_exercises where session_id = v_id and not (id = any (v_keep_ex));

  return v_id;
end $$;

-- Same plan for several athletes in one transaction.
create or replace function public.create_sessions(p jsonb, p_athletes uuid[]) returns uuid[]
language plpgsql security invoker set search_path = public as $$
declare
  v_athlete uuid;
  v_ids uuid[] := '{}';
begin
  if coalesce(array_length(p_athletes, 1), 0) = 0 then
    raise exception 'NO_ATHLETES' using errcode = 'P0001';
  end if;
  foreach v_athlete in array p_athletes loop
    v_ids := v_ids || public.save_session((p - 'id' - 'plan_id') || jsonb_build_object('athlete_id', v_athlete,
      'plan_id', case when array_length(p_athletes, 1) = 1 then p ->> 'plan_id' end));
  end loop;
  return v_ids;
end $$;

-- Build the save_session payload for an existing session (used for copying and templates).
create or replace function public.session_payload(p_session uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'athlete_id', s.athlete_id, 'plan_id', s.plan_id, 'kind', s.kind, 'category', s.category, 'title', s.title,
    'scheduled_date', s.scheduled_date, 'scheduled_time', s.scheduled_time, 'goal', s.goal,
    'instructions', s.instructions, 'notes', s.notes, 'planned_rpe', s.planned_rpe,
    'planned_duration_s', s.planned_duration_s,
    'running', (select to_jsonb(r) - 'session_id' from public.running_workouts r where r.session_id = s.id),
    'segments', coalesce((select jsonb_agg(to_jsonb(g) - 'session_id' - 'id' - 'position' order by g.position)
                          from public.running_segments g where g.session_id = s.id), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg((to_jsonb(e) - 'session_id' - 'id' - 'position') || jsonb_build_object('sets',
                             coalesce((select jsonb_agg(to_jsonb(x) - 'exercise_id' - 'id' - 'position' order by x.position)
                                       from public.strength_sets x where x.exercise_id = e.id), '[]'::jsonb))
                             order by e.position)
                           from public.strength_exercises e where e.session_id = s.id), '[]'::jsonb))
  from public.training_sessions s where s.id = p_session
$$;

-- Copy a session to another date and/or athlete. Execution data is never copied.
create or replace function public.copy_session(p_session uuid, p_date date, p_athlete uuid default null) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_payload jsonb := public.session_payload(p_session);
begin
  if v_payload is null then raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_athlete is not null and p_athlete <> (v_payload ->> 'athlete_id')::uuid then
    v_payload := v_payload - 'plan_id';
  end if;
  return public.save_session(v_payload || jsonb_build_object(
    'scheduled_date', p_date, 'athlete_id', coalesce(p_athlete, (v_payload ->> 'athlete_id')::uuid)));
end $$;

-- Move a session to another day (calendar drag / "zmień datę").
create or replace function public.reschedule_session(p_session uuid, p_date date) returns void
language sql security invoker set search_path = public as $$
  update public.training_sessions set scheduled_date = p_date where id = p_session
$$;

-- ================================================================ execution: save the athlete's actual results
-- p = {
--   session_id, status ('in_progress'|'completed'|'partial'|'skipped'), performed_on?, rpe?, feeling?, comment?,
--   running?: { distance_m, duration_s, avg_pace_s, pace_is_manual, avg_hr, max_hr, elevation_gain_m, cadence_spm, conditions },
--   laps?: [ { segment_id?, rep_index, distance_m, duration_s, avg_hr, notes } ],
--   exercises?: [ { exercise_id?, exercise_name?, status, comment,
--                   sets: [ { set_id?, reps, load_kg, duration_s, rpe, rir, completed } ] } ]
-- }
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
begin
  insert into public.workout_executions as w (session_id, athlete_id, status, performed_on, rpe, feeling, comment, started_at)
  values (v_session, auth.uid(), (p ->> 'status')::public.execution_status,
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

revoke execute on function public.save_session(jsonb), public.create_sessions(jsonb, uuid[]), public.session_payload(uuid),
  public.copy_session(uuid, date, uuid), public.reschedule_session(uuid, date), public.save_execution(jsonb),
  public._int(jsonb, text), public._num(jsonb, text), public._txt(jsonb, text) from public, anon;
grant execute on function public._int(jsonb, text), public._num(jsonb, text), public._txt(jsonb, text) to authenticated;
grant execute on function public.save_session(jsonb) to authenticated;
grant execute on function public.create_sessions(jsonb, uuid[]) to authenticated;
grant execute on function public.session_payload(uuid) to authenticated;
grant execute on function public.copy_session(uuid, date, uuid) to authenticated;
grant execute on function public.reschedule_session(uuid, date) to authenticated;
grant execute on function public.save_execution(jsonb) to authenticated;
