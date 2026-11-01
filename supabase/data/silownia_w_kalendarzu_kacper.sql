-- VYRA · treningi siłowe z planu 2026/27 w kalendarzu zawodnika „Kacper Adamczyk”.
-- Każdy dzień planu z „Siłownia A” lub „Siłownia B” dostaje osobny trening siłowy z szablonu
-- (ćwiczenia i serie), a wskazówka z planu (np. „lekko, 3×10”) trafia do celu treningu.
-- Wymaga: szablony_silownia_A_B.sql i plan_biegowy_2026_27_kacper.sql. Ponowne uruchomienie nic nie zdubluje.

do $$
declare
  v_ath  uuid;
  v_plan record;
  v_tpl  record;
  r      record;
  v_s    uuid;
  v_ex   uuid;
  ex     jsonb;
  st     jsonb;
  v_letter text;
  v_hint text;
  v_n    int := 0;
  ex_pos int;
  st_pos int;
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and lower(trim(full_name)) = lower('Kacper Adamczyk') order by created_at limit 1;
  if v_ath is null then raise exception 'Nie znaleziono konta zawodnika "Kacper Adamczyk".'; end if;

  select * into v_plan from public.training_plans where athlete_id = v_ath and name = 'Plan biegowy 2026/27';
  if v_plan.id is null then raise exception 'Najpierw uruchom plan_biegowy_2026_27_kacper.sql.'; end if;

  perform set_config('vyra.bulk', 'on', true);

  for r in
    select s.scheduled_date, s.instructions,
           (regexp_match(s.instructions, 'Siłownia ([AB])(?:\s*\(([^)]*)\))?')) as m
      from public.training_sessions s
     where s.plan_id = v_plan.id and s.kind = 'running' and s.instructions ~ 'Siłownia [AB]'
     order by s.scheduled_date
  loop
    v_letter := r.m[1];
    v_hint := r.m[2];
    select * into v_tpl from public.training_templates
     where name = case v_letter when 'A' then 'Siłownia A: nogi i siła' else 'Siłownia B: plyo i stabilizacja' end
     order by created_at limit 1;
    if v_tpl.id is null then raise exception 'Najpierw uruchom szablony_silownia_A_B.sql.'; end if;

    continue when exists (
      select 1 from public.training_sessions
       where athlete_id = v_ath and scheduled_date = r.scheduled_date and kind = 'strength' and template_id = v_tpl.id);

    insert into public.training_sessions (coach_id, athlete_id, plan_id, template_id, kind, category, title, scheduled_date,
                                          goal, instructions, notes, planned_duration_s)
    values (v_plan.coach_id, v_ath, v_plan.id, v_tpl.id, 'strength', v_tpl.category,
            v_tpl.payload->>'title' || coalesce(' (' || v_hint || ')', ''),
            r.scheduled_date,
            coalesce('Wskazówka z planu: ' || v_hint || '. ', '') || coalesce(v_tpl.payload->>'goal', ''),
            v_tpl.payload->>'instructions',
            'Po bieganiu tego dnia (min. 3 godziny po akcencie).',
            nullif(v_tpl.payload->>'planned_duration_s', '')::int)
    returning id into v_s;

    for ex, ex_pos in select e, o::int from jsonb_array_elements(v_tpl.payload->'exercises') with ordinality as t(e, o) loop
      insert into public.strength_exercises (session_id, position, name, description, muscle_group, rest_s, tempo, notes)
      values (v_s, ex_pos, ex->>'name', ex->>'description', ex->>'muscle_group', nullif(ex->>'rest_s', '')::int,
              ex->>'tempo', ex->>'notes')
      returning id into v_ex;
      for st, st_pos in select e, o::int from jsonb_array_elements(ex->'sets') with ordinality as t(e, o) loop
        insert into public.strength_sets (exercise_id, position, planned_reps, planned_load_kg, planned_duration_s, planned_rpe, planned_rir)
        values (v_ex, st_pos, nullif(st->>'planned_reps', '')::int, nullif(st->>'planned_load_kg', '')::numeric,
                nullif(st->>'planned_duration_s', '')::int, nullif(st->>'planned_rpe', '')::numeric, nullif(st->>'planned_rir', '')::int);
      end loop;
    end loop;
    v_n := v_n + 1;
  end loop;

  perform set_config('vyra.bulk', '', true);
  if v_n > 0 then
    perform public.notify(v_ath, 'session_assigned', 'Nowe treningi siłowe', v_n || ' × siłownia A/B w planie', '/athlete/calendar', null);
  end if;
  raise notice 'Dodano % treningów siłowych.', v_n;
end $$;
