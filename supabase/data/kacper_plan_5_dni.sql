-- VYRA · Kacper Adamczyk: miesiąc na 5 biegów w tygodniu (19.11 – 20.12.2026), od 21.12 znowu zwykły plan na 6 dni.
-- Pn: basen, bez biegania · Wt: akcent + siłownia A · Śr: easy · Czw: Run Club + siłownia B (i basen)
-- Pt: wolne · Sob: drugi akcent · Nd: long. Test 3 km w sobotę 19.12 (zamiast 12.12).
-- Akcenty z pierwszych 2 tygodni tylko po zgodzie lekarza (ciśnienie, kołatanie); bez zgody tyle samo km spokojnie.
-- Zmienia tylko treningi z tego miesiąca bez zapisanego wykonania. Uruchom w Supabase → SQL Editor. Ponowne uruchomienie nic nie zdubluje.

do $$
declare
  v_ath   uuid;
  v_plan  record;
  v_s     uuid;
  v_ex    uuid;
  v_tpl   record;
  v_del   int;
  v_n     int := 0;
  v_g     int := 0;
  e       jsonb;
  r       record;
  ex      jsonb;
  st      jsonb;
  ex_pos  int;
  st_pos  int;
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and lower(trim(full_name)) = lower('Kacper Adamczyk') order by created_at limit 1;
  if v_ath is null then raise exception 'Nie znaleziono konta zawodnika „Kacper Adamczyk”.'; end if;

  select * into v_plan from public.training_plans where athlete_id = v_ath and name = 'Plan biegowy 2026/27';
  if v_plan.id is null then raise exception 'Nie ma planu „Plan biegowy 2026/27”.'; end if;

  if exists (select 1 from public.training_sessions where plan_id = v_plan.id and notes like 'Plan na 5 dni%') then
    raise notice 'Plan na 5 dni już jest, nic nie zmieniono.';
    return;
  end if;

  perform set_config('vyra.bulk', 'on', true);

  -- 1) Treningi z tego miesiąca w starym układzie (bieganie i siłownia), bez zapisanego wykonania.
  delete from public.training_sessions s
   where s.plan_id = v_plan.id and s.scheduled_date between date '2026-11-19' and date '2026-12-20' and s.kind in ('running', 'strength')
     and s.status = 'planned'
     and not exists (select 1 from public.workout_executions x where x.session_id = s.id);
  get diagnostics v_del = row_count;

  -- 2) Miesiąc na 5 biegów w tygodniu.
  for e in select * from jsonb_array_elements('[{"date": "2026-11-19", "cat": "easy", "km": 6, "title": "Run Club luźno", "instr": "1 km truchtu + Run Club 18:00 (ok. 5 km w tempie rozmowy). Bez przebieżek.", "notes": "Plan na 5 dni · Tydzień przejściowy: odpoczynek po zmęczeniu, bez akcentów."}, {"date": "2026-11-21", "cat": "easy", "km": 9, "title": "Easy 9 km + przebieżki", "instr": "9 km easy + 6 przebieżek 100 m. Tylko jeśli gotowość na zegarku jest co najmniej średnia; inaczej 6 km.", "notes": "Plan na 5 dni · Tydzień przejściowy: odpoczynek po zmęczeniu, bez akcentów."}, {"date": "2026-11-22", "cat": "easy", "km": 8, "title": "Easy 8 km", "instr": "8 km bardzo spokojnie albo wolne, jeśli dalej czujesz się zmęczony.", "notes": "Plan na 5 dni · Tydzień przejściowy: odpoczynek po zmęczeniu, bez akcentów."}, {"date": "2026-11-24", "cat": "easy", "km": 10, "title": "Easy 10 km + przebieżki · siłownia A", "instr": "10 km easy + 6×20 s żwawo / 1 min trucht · Siłownia A (lekko, 2×10)", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 1/4. Powrót: wszystko spokojnie, przebieżki zostają. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-11-25", "cat": "easy", "km": 10, "title": "Easy 10 km", "instr": "10 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 1/4. Powrót: wszystko spokojnie, przebieżki zostają. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-11-26", "cat": "easy", "km": 8, "title": "Run Club + rozbieganie · siłownia B", "instr": "3 km easy przed zbiórką + Run Club 18:00 (ok. 5 km w tempie rozmowy) · Siłownia B (lekko, bez skoków)", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 1/4. Powrót: wszystko spokojnie, przebieżki zostają. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-11-28", "cat": "fartlek", "km": 10, "title": "10 km, w środku 6×2 min żwawo", "instr": "3 km + 6×2 min RPE 6 (próg: tętno 165-172, ok. 3:55) / 2 min trucht + 3 km. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie.", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 1/4. Powrót: wszystko spokojnie, przebieżki zostają. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-11-29", "cat": "long", "km": 14, "title": "Długi bieg 14 km", "instr": "14 km easy, tempo rozmowy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 1/4. Powrót: wszystko spokojnie, przebieżki zostają. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-01", "cat": "intervals", "km": 11, "title": "5×1000 m progowo · siłownia A", "instr": "3 km + 5×1000 m (próg: tętno 165-172, ok. 3:55), 1 min trucht + 2 km · Siłownia A (2×10). Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie.", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 2/4. Pierwsze odcinki progowe, objętość nadal niska. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-02", "cat": "easy", "km": 11, "title": "Easy 11 km", "instr": "11 km easy + 6 przebieżek", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 2/4. Pierwsze odcinki progowe, objętość nadal niska. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-03", "cat": "easy", "km": 8, "title": "Run Club + przebieżki · siłownia B", "instr": "3 km easy + 6×100 m swobodnie szybko + Run Club 18:00 (ok. 5 km w tempie rozmowy) · Siłownia B (lekko)", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 2/4. Pierwsze odcinki progowe, objętość nadal niska. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-05", "cat": "fartlek", "km": 10, "title": "Fartlek mieszany", "instr": "3 km + 8×(1 min w 3:40 + 20 s w 3:10), 90 s lekko między + 3 km. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie.", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 2/4. Pierwsze odcinki progowe, objętość nadal niska. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-06", "cat": "long", "km": 16, "title": "Długi bieg 16 km", "instr": "16 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 2/4. Pierwsze odcinki progowe, objętość nadal niska. Akcent tylko po zgodzie lekarza (ciśnienie, kołatanie). Bez zgody: tyle samo km spokojnie."}, {"date": "2026-12-08", "cat": "fartlek", "km": 12, "title": "Fartlek progowy · siłownia A", "instr": "3 km + 4×(5 min próg: tętno 165-172 + 1 min w 3:35), 1 min lekko między + 2 km · Siłownia A (3×8)", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 3/4. Dłuższe odcinki progowe."}, {"date": "2026-12-09", "cat": "easy", "km": 12, "title": "Easy 12 km", "instr": "12 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 3/4. Dłuższe odcinki progowe."}, {"date": "2026-12-10", "cat": "easy", "km": 9, "title": "Run Club + podbiegi · siłownia B", "instr": "3 km easy + 8×10 s pod górę (pełna przerwa) + Run Club 18:00 (ok. 5 km w tempie rozmowy) · Siłownia B", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 3/4. Dłuższe odcinki progowe."}, {"date": "2026-12-12", "cat": "fartlek", "km": 11, "title": "Fartlek mieszany", "instr": "3 km + 6×(2 min w 3:40 + 30 s w 3:05), 1 min lekko między + 2 km", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 3/4. Dłuższe odcinki progowe."}, {"date": "2026-12-13", "cat": "long", "km": 18, "title": "Długi bieg 18 km", "instr": "18 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 3/4. Dłuższe odcinki progowe."}, {"date": "2026-12-15", "cat": "threshold", "km": 14, "title": "3×3 km progowo · siłownia A", "instr": "3 km + 3×3 km (próg: tętno 165-172), 1 min trucht + 2 km · Siłownia A (3×6)", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 4/4. Ostatni tydzień na 5 dni. Test 3 km w sobotę: z wyniku przeliczamy tempa."}, {"date": "2026-12-16", "cat": "easy", "km": 12, "title": "Easy 12 km", "instr": "12 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 4/4. Ostatni tydzień na 5 dni. Test 3 km w sobotę: z wyniku przeliczamy tempa."}, {"date": "2026-12-17", "cat": "easy", "km": 9, "title": "Run Club + flying · siłownia B", "instr": "3 km easy + 4×60 m flying szybko (pełna przerwa) + Run Club 18:00 (ok. 5 km w tempie rozmowy) · Siłownia B", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 4/4. Ostatni tydzień na 5 dni. Test 3 km w sobotę: z wyniku przeliczamy tempa."}, {"date": "2026-12-19", "cat": "test", "km": 10, "title": "Test 3 km", "instr": "3 km rozgrzewki, 4 przebieżki, 3 km maksymalnie równo (bieżnia), 2 km schłodzenia. Wynik wpisz do aplikacji.", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 4/4. Ostatni tydzień na 5 dni. Test 3 km w sobotę: z wyniku przeliczamy tempa."}, {"date": "2026-12-20", "cat": "long", "km": 18, "title": "Długi bieg 18 km", "instr": "18 km easy", "notes": "Plan na 5 dni · Miesiąc na 5 dni, tydzień 4/4. Ostatni tydzień na 5 dni. Test 3 km w sobotę: z wyniku przeliczamy tempa."}]'::jsonb) loop
    insert into public.training_sessions (coach_id, athlete_id, plan_id, kind, category, title, scheduled_date, instructions, notes)
    values (v_plan.coach_id, v_ath, v_plan.id, 'running', e->>'cat', e->>'title', (e->>'date')::date, e->>'instr', e->>'notes')
    returning id into v_s;
    insert into public.running_workouts (session_id, structure, planned_distance_m)
    values (v_s,
            case e->>'cat' when 'fartlek' then 'fartlek' when 'progression' then 'progression'
                           when 'intervals' then 'intervals' when 'threshold' then 'intervals' when 'hills' then 'intervals'
                           when 'race_pace' then 'intervals' else 'continuous' end,
            (e->>'km')::int * 1000);
    v_n := v_n + 1;
  end loop;

  -- 3) Siłownia A (wtorek) i B (czwartek) jako osobne treningi z szablonów.
  for r in
    select s.scheduled_date, (regexp_match(s.instructions, 'Siłownia ([AB])(?:\s*\(([^)]*)\))?')) as m
      from public.training_sessions s
     where s.plan_id = v_plan.id and s.kind = 'running' and s.scheduled_date between date '2026-11-19' and date '2026-12-20'
       and s.instructions ~ 'Siłownia [AB]'
     order by s.scheduled_date
  loop
    select * into v_tpl from public.training_templates
     where name = case r.m[1] when 'A' then 'Siłownia A: nogi i siła' else 'Siłownia B: plyo i stabilizacja' end
     order by created_at limit 1;
    continue when v_tpl.id is null;
    continue when exists (select 1 from public.training_sessions
                           where athlete_id = v_ath and scheduled_date = r.scheduled_date and kind = 'strength' and template_id = v_tpl.id);
    insert into public.training_sessions (coach_id, athlete_id, plan_id, template_id, kind, category, title, scheduled_date,
                                          goal, instructions, notes, planned_duration_s)
    values (v_plan.coach_id, v_ath, v_plan.id, v_tpl.id, 'strength', v_tpl.category,
            v_tpl.payload->>'title' || coalesce(' (' || r.m[2] || ')', ''), r.scheduled_date,
            coalesce('Wskazówka z planu: ' || r.m[2] || '. ', '') || coalesce(v_tpl.payload->>'goal', ''),
            v_tpl.payload->>'instructions', 'Plan na 5 dni · Po bieganiu tego dnia (min. 3 godziny po akcencie).',
            nullif(v_tpl.payload->>'planned_duration_s', '')::int)
    returning id into v_s;
    for ex, ex_pos in select x, o::int from jsonb_array_elements(v_tpl.payload->'exercises') with ordinality as t(x, o) loop
      insert into public.strength_exercises (session_id, position, name, description, muscle_group, rest_s, tempo, notes)
      values (v_s, ex_pos, ex->>'name', ex->>'description', ex->>'muscle_group', nullif(ex->>'rest_s', '')::int, ex->>'tempo', ex->>'notes')
      returning id into v_ex;
      for st, st_pos in select x, o::int from jsonb_array_elements(ex->'sets') with ordinality as t(x, o) loop
        insert into public.strength_sets (exercise_id, position, planned_reps, planned_load_kg, planned_duration_s, planned_rpe, planned_rir)
        values (v_ex, st_pos, nullif(st->>'planned_reps', '')::int, nullif(st->>'planned_load_kg', '')::numeric,
                nullif(st->>'planned_duration_s', '')::int, nullif(st->>'planned_rpe', '')::numeric, nullif(st->>'planned_rir', '')::int);
      end loop;
    end loop;
    v_g := v_g + 1;
  end loop;

  -- 4) Powrót do 6 dni od 21.12 łagodniej: pierwszy poniedziałek krótszy, pierwszy long 20 km zamiast 22.
  update public.training_sessions set title = 'Easy 8 km + przebieżki', instructions = '8 km easy + 6 przebieżek 100 m',
         notes = coalesce(notes || ' ', '') || 'Pierwszy tydzień znowu na 6 dni, więc poniedziałek krótszy.'
   where plan_id = v_plan.id and kind = 'running' and status = 'planned' and scheduled_date = date '2026-12-21' and category = 'easy';
  update public.running_workouts set planned_distance_m = 8000
   where session_id in (select id from public.training_sessions where plan_id = v_plan.id and kind = 'running' and scheduled_date = date '2026-12-21' and category = 'easy');
  update public.training_sessions set title = 'Długi bieg 20 km', instructions = '20 km easy',
         notes = coalesce(notes || ' ', '') || 'Pierwszy long po miesiącu na 5 dni: 20 km zamiast 22.'
   where plan_id = v_plan.id and kind = 'running' and status = 'planned' and scheduled_date = date '2026-12-27' and category = 'long';
  update public.running_workouts set planned_distance_m = 20000
   where session_id in (select id from public.training_sessions where plan_id = v_plan.id and kind = 'running' and scheduled_date = date '2026-12-27' and category = 'long');

  perform set_config('vyra.bulk', '', true);
  perform public.notify(v_ath, 'session_assigned', 'Miesiąc na 5 biegów w tygodniu',
    v_n || ' biegów i ' || v_g || ' × siłownia · 19.11–20.12', '/athlete/calendar', null);
  raise notice 'Usunięto % starych, dodano % biegów i % treningów siłowych.', v_del, v_n, v_g;
end $$;
