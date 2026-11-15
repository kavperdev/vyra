-- VYRA · siła w domu jako OSOBNE treningi w kalendarzu zawodnika „Piotrek” (plan 5 km · 14 marca 2027).
-- Każdy dzień z „Siła A”, „Siła B” albo „tylko core” dostaje osobny trening siłowy z ćwiczeniami i seriami,
-- a z treningu biegowego znika dopisek o sile. Uruchom PO plan_5km_2027_piotr_amanowicz.sql.
-- Ponowne uruchomienie nic nie zdubluje.

do $$
declare
  v_ath  uuid;
  v_plan record;
  r      record;
  v_s    uuid;
  v_ex   uuid;
  ex     jsonb;
  ex_pos int;
  k      int;
  v_kind text;
  v_hint text;
  v_sets int;
  v_list jsonb;
  v_title text;
  v_cat  text;
  v_goal text;
  v_min  int;
  v_n    int := 0;
  a_list jsonb := '[
    {"name":"Przysiad bułgarski (plecak)","muscle_group":"nogi","rest_s":60,"reps":8,"notes":"Na każdą nogę. Kolano nad stopą, kontrola w dół."},
    {"name":"Martwy ciąg na jednej nodze (plecak)","muscle_group":"tył uda, pośladki","rest_s":60,"reps":8,"notes":"Na każdą nogę. Plecy proste, biodro do tyłu."},
    {"name":"Hip thrust na jednej nodze","muscle_group":"pośladki","rest_s":45,"reps":10,"notes":"Na każdą nogę. Barki na kanapie lub łóżku."},
    {"name":"Wspięcia na palce na stopniu","muscle_group":"łydki, Achilles","rest_s":45,"reps":12,"tempo":"1-0-3","notes":"Powoli w dół (3 s). Ochrona ścięgna Achillesa."},
    {"name":"Plank boczny","muscle_group":"core","rest_s":30,"dur":35,"notes":"Na każdą stronę."},
    {"name":"Dead bug","muscle_group":"core","rest_s":30,"reps":10,"notes":"Odcinek lędźwiowy przy podłodze."}
  ]';
  b_list jsonb := '[
    {"name":"Skip A i skip C","muscle_group":"sprężystość","rest_s":45,"reps":20,"notes":"20 m każdego. Wysoko na stopie."},
    {"name":"Pogo (skoki z kostek)","muscle_group":"sprężystość","rest_s":45,"reps":20,"notes":"Krótki kontakt z podłożem."},
    {"name":"Wskoki na stopień lub ławkę","muscle_group":"moc","rest_s":60,"reps":6,"notes":"Miękkie lądowanie."},
    {"name":"Copenhagen plank","muscle_group":"biodra, pachwiny","rest_s":30,"dur":20,"notes":"Na każdą stronę."},
    {"name":"Mostek na jednej nodze","muscle_group":"pośladki","rest_s":30,"reps":10,"notes":"Na każdą nogę."},
    {"name":"Stanie na jednej nodze, oczy zamknięte","muscle_group":"stopa, kostka","rest_s":15,"dur":30,"notes":"Na każdą nogę."}
  ]';
  c_list jsonb := '[
    {"name":"Plank boczny","muscle_group":"core","rest_s":30,"dur":30,"notes":"Na każdą stronę."},
    {"name":"Dead bug","muscle_group":"core","rest_s":30,"reps":10,"notes":"Odcinek lędźwiowy przy podłodze."},
    {"name":"Mostek na jednej nodze","muscle_group":"pośladki","rest_s":30,"reps":10,"notes":"Na każdą nogę."}
  ]';
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and (lower(trim(full_name)) = 'piotrek' or full_name ilike '%amanowicz%')
   order by created_at limit 1;
  if v_ath is null then raise exception 'Nie znaleziono konta zawodnika „Piotrek”.'; end if;

  select * into v_plan from public.training_plans where athlete_id = v_ath and name = 'Plan 5 km · 14 marca 2027';
  if v_plan.id is null then raise exception 'Najpierw uruchom plan_5km_2027_piotr_amanowicz.sql.'; end if;

  perform set_config('vyra.bulk', 'on', true);

  for r in
    select s.id, s.scheduled_date, s.title, s.instructions
      from public.training_sessions s
     where s.plan_id = v_plan.id and s.kind = 'running'
       and (s.instructions ~ 'Siła [AB]' or s.instructions ~ 'tylko core')
     order by s.scheduled_date
  loop
    if r.instructions ~ 'Siła A' then
      v_kind := 'A'; v_hint := (regexp_match(r.instructions, 'Siła A(?:\s*\(([^)]*)\))?'))[1];
    elsif r.instructions ~ 'Siła B' then
      v_kind := 'B'; v_hint := (regexp_match(r.instructions, 'Siła B(?:\s*\(([^)]*)\))?'))[1];
    else
      v_kind := 'C'; v_hint := null;
    end if;
    if v_kind = 'B' and coalesce(v_hint, '') ~ 'tylko core' then v_kind := 'C'; v_hint := null; end if;

    -- Sets: "2 serie" in the hint, light weeks 2, otherwise 3.
    v_sets := coalesce((regexp_match(coalesce(v_hint, ''), '(\d) serie'))[1]::int,
                       case when coalesce(v_hint, '') ~ 'lekko|technika' or v_kind = 'C' then 2 else 3 end);
    if v_kind = 'A' then
      v_list := a_list; v_cat := 'strength'; v_min := 30;
      v_title := 'Siła A · nogi (w domu)';
      v_goal := 'Siła nóg i ochrona ścięgien. Po bieganiu tego dnia.';
    elsif v_kind = 'B' then
      v_list := b_list; v_cat := 'power'; v_min := 20;
      v_title := 'Siła B · sprężystość i stabilizacja (w domu)';
      v_goal := 'Sprężystość, stopa i biodra. Po bieganiu tego dnia.';
    else
      v_list := c_list; v_cat := 'strength'; v_min := 15;
      v_title := 'Core 15 min (w domu)';
      v_goal := 'Tydzień startowy: tylko lekki core, bez obciążenia nóg.';
    end if;

    -- Running session: drop the strength note from its title and instructions.
    update public.training_sessions
       set title = btrim(regexp_replace(title, '\s*\+\s*siła [AB]\s*$', '', 'i')),
           instructions = btrim(regexp_replace(instructions, '\s*·\s*(Siła [AB](\s*\([^)]*\))?|tylko core[^·]*)\s*$', ''))
     where id = r.id;

    continue when exists (
      select 1 from public.training_sessions
       where plan_id = v_plan.id and scheduled_date = r.scheduled_date and kind = 'strength');

    insert into public.training_sessions (coach_id, athlete_id, plan_id, kind, category, title, scheduled_date,
                                          goal, instructions, notes, planned_duration_s)
    values (v_plan.coach_id, v_ath, v_plan.id, 'strength', v_cat,
            v_title || coalesce(' · ' || v_hint, ''), r.scheduled_date, v_goal,
            v_sets || ' serie każdego ćwiczenia. Rozgrzewka 5 min: marsz, krążenia bioder, mostki. Zapas 2-3 powtórzeń, nigdy do upadku.',
            'W domu: plecak z obciążeniem, guma, stopień lub ławka.', v_min * 60)
    returning id into v_s;

    for ex, ex_pos in select e, o::int from jsonb_array_elements(v_list) with ordinality as t(e, o) loop
      insert into public.strength_exercises (session_id, position, name, muscle_group, rest_s, tempo, notes)
      values (v_s, ex_pos, ex->>'name', ex->>'muscle_group', (ex->>'rest_s')::int, ex->>'tempo', ex->>'notes')
      returning id into v_ex;
      for k in 1..v_sets loop
        insert into public.strength_sets (exercise_id, position, planned_reps, planned_duration_s, planned_rir)
        values (v_ex, k, nullif(ex->>'reps', '')::int, nullif(ex->>'dur', '')::int, 2);
      end loop;
    end loop;
    v_n := v_n + 1;
  end loop;

  perform set_config('vyra.bulk', '', true);
  if v_n > 0 then
    perform public.notify(v_ath, 'session_assigned', 'Treningi siłowe w kalendarzu', v_n || ' × siła w domu', '/athlete/calendar', null);
  end if;
  raise notice 'Dodano % treningów siłowych.', v_n;
end $$;
