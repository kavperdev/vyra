-- Zestaw na kolano (bok, prawa noga) i duży palec prawej stopy: 2 tygodnie od jutra.
-- Codziennie: "Stopa i mobilność (A)". Co drugi dzień: "Siła: kolano i biodro (B)".
-- Uruchom w Supabase → SQL Editor. Ponowne uruchomienie nie dubluje treningów.
do $$
declare
  v_athlete uuid;
  v_coach   uuid;
  v_n       int;
  v_start   date := current_date + 1;
  v_day     date;
  v_id      uuid;
  v_ex      jsonb;
  v_exid    uuid;
  v_pos     int;
  v_i       int;
  v_added   int := 0;
  v_a jsonb := '[
    {"name":"Rolowanie stopy piłeczką","description":"Prawa stopa. Mocniej pod łukiem, delikatnie pod dużym palcem.","sets":[{"d":120}]},
    {"name":"Rolowanie łydki","description":"Wałek albo dłonie, spokojnie.","sets":[{"d":90}]},
    {"name":"Odginanie dużego palca ręką","description":"Na siedząco chwyć prawy duży palec i odegnij w górę, przytrzymaj 5 s. 15 powtórzeń.","sets":[{"r":15}]},
    {"name":"Duży palec przy ścianie","description":"Palec oparty o ścianę i odgięty w górę, pochylaj kolano do ściany, przytrzymaj 5 s. Bez ostrego bólu.","sets":[{"r":10}]},
    {"name":"Rozciąganie łydki, proste kolano","description":"Przy ścianie, prawa noga 2 serie.","sets":[{"d":45},{"d":45}]},
    {"name":"Rozciąganie łydki, zgięte kolano","description":"Przy ścianie, prawa noga 2 serie.","sets":[{"d":45},{"d":45}]},
    {"name":"Toe yoga: duży palec w górę","description":"Unieś duży palec, pomagając ręką. Puść rękę i spróbuj utrzymać 3 s.","sets":[{"r":10}]},
    {"name":"Toe yoga: duży palec w dół","description":"Duży palec wciśnięty w podłogę, małe palce w górę.","sets":[{"r":10}]}
  ]';
  v_b jsonb := '[
    {"name":"Odwodzenie nogi w leżeniu bokiem","description":"Noga prosta, lekko w tył, palce w dół. Zaczynaj od prawej.","sets":[{"r":15},{"r":15},{"r":15}]},
    {"name":"Deska bokiem","description":"Biodra wysoko, ciało w jednej linii. Na każdy bok.","sets":[{"d":35},{"d":35},{"d":35}]},
    {"name":"Most biodrowy na jednej nodze","description":"2 s zatrzymania na górze. Na każdą nogę.","sets":[{"r":10},{"r":10},{"r":10}]},
    {"name":"Zejście ze stopnia","description":"Prawa noga na schodku, lewą opuszczaj 3 s i dotknij piętą podłogi. Prawe kolano nad drugim palcem, nie ucieka do środka (lustro).","sets":[{"r":8},{"r":8},{"r":8}]},
    {"name":"Martwy ciąg na jednej nodze","description":"Lekko ugięte kolano, plecy proste. Najpierw bez ciężaru, potem hantla.","sets":[{"r":8},{"r":8},{"r":8}]},
    {"name":"Wspięcia na palce na jednej nodze","description":"Nacisk przez duży palec, nie przez zewnętrzną krawędź. 3 s w górę, 3 s w dół.","sets":[{"r":10},{"r":10},{"r":10}]},
    {"name":"Chodzenie bokiem z gumą","description":"Guma nad kolanami lub kostkami, lekki przysiad. Kroki w każdą stronę.","sets":[{"r":15},{"r":15}]}
  ]';
  v_a_instr text := 'Codziennie, najlepiej wieczorem. Nic nie powinno boleć powyżej 3/10.
Przed każdym biegiem (5 min): palec przy ścianie 10×, chodzenie bokiem z gumą 2 × 10 kroków, most na jednej nodze 10× na nogę, 10 wspięć na prawej nodze.
Bieganie w tych 2 tygodniach: tylko spokojnie, bez przebieżek, podbiegów i zbiegów. Krótszy krok, kadencja o 5–10% wyższa. Płaska trasa. Ból narasta → przerwij i zrób rower.';
begin
  select count(*), min(id::text)::uuid into v_n, v_athlete
    from public.profiles
   where role = 'athlete' and lower(full_name) like '%kacper%adamczyk%';
  if v_n = 0 then raise exception 'Nie znaleziono zawodnika Kacper Adamczyk'; end if;
  if v_n > 1 then raise exception 'Jest % zawodników o nazwisku Kacper Adamczyk, podaj e-mail', v_n; end if;

  select ca.coach_id into v_coach from public.coach_athletes ca
   where ca.athlete_id = v_athlete and ca.status = 'active' order by ca.created_at limit 1;
  if v_coach is null then
    select id into v_coach from public.profiles where role = 'coach' order by (staff_role = 'founder') desc, created_at limit 1;
  end if;

  perform set_config('vyra.bulk', 'on', true);
  for v_i in 0..13 loop
    v_day := v_start + v_i;

    -- A: every day
    if not exists (select 1 from public.training_sessions where athlete_id = v_athlete and scheduled_date = v_day and title like 'Stopa i mobilność (A)%') then
      insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date, goal, instructions, planned_rpe, planned_duration_s, created_by, updated_by)
      values (v_coach, v_athlete, 'mobility', 'mobility',
              case when v_i = 13 then 'Stopa i mobilność (A) + sprawdzenie' else 'Stopa i mobilność (A)' end,
              v_day, 'Ruchomość i kontrola dużego palca prawej stopy, rozluźnienie łydki.',
              v_a_instr || case when v_i = 13 then E'\n\nSPRAWDZENIE PO 2 TYGODNIACH: czy prawy duży palec unosi się choć trochę sam? Czy kolano boli mniej przy spokojnym biegu? Tak → wracają przebieżki (4 × 15 s). Nie → fizjoterapeuta.' else '' end,
              2, 600, v_coach, v_coach)
      returning id into v_id;
      v_pos := 0;
      for v_ex in select * from jsonb_array_elements(v_a) loop
        v_pos := v_pos + 1;
        insert into public.strength_exercises (session_id, position, name, description, rest_s)
        values (v_id, v_pos, v_ex ->> 'name', v_ex ->> 'description', 20) returning id into v_exid;
        insert into public.strength_sets (exercise_id, position, planned_reps, planned_duration_s)
        select v_exid, ord, nullif(s ->> 'r', '')::int, nullif(s ->> 'd', '')::int
          from jsonb_array_elements(v_ex -> 'sets') with ordinality as t(s, ord);
      end loop;
      v_added := v_added + 1;
    end if;

    -- B: every other day
    if v_i % 2 = 0 and not exists (select 1 from public.training_sessions where athlete_id = v_athlete and scheduled_date = v_day and title = 'Siła: kolano i biodro (B)') then
      insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date, goal, instructions, planned_rpe, planned_duration_s, created_by, updated_by)
      values (v_coach, v_athlete, 'strength', 'strength', 'Siła: kolano i biodro (B)', v_day,
              'Pośladek średni i stabilizacja kolana: mniej obciążenia z boku prawego kolana.',
              'Obie nogi, zaczynaj od prawej. Ruch powolny i kontrolowany, bez bólu powyżej 3/10. Przerwy ok. 60 s.',
              5, 1200, v_coach, v_coach)
      returning id into v_id;
      v_pos := 0;
      for v_ex in select * from jsonb_array_elements(v_b) loop
        v_pos := v_pos + 1;
        insert into public.strength_exercises (session_id, position, name, description, rest_s)
        values (v_id, v_pos, v_ex ->> 'name', v_ex ->> 'description', 60) returning id into v_exid;
        insert into public.strength_sets (exercise_id, position, planned_reps, planned_duration_s)
        select v_exid, ord, nullif(s ->> 'r', '')::int, nullif(s ->> 'd', '')::int
          from jsonb_array_elements(v_ex -> 'sets') with ordinality as t(s, ord);
      end loop;
      v_added := v_added + 1;
    end if;
  end loop;
  perform set_config('vyra.bulk', '', true);

  raise notice 'Dodano % treningów (od % do %)', v_added, v_start, v_start + 13;
end $$;

select scheduled_date as dzien, title as trening
  from public.training_sessions s join public.profiles p on p.id = s.athlete_id
 where p.role = 'athlete' and lower(p.full_name) like '%kacper%adamczyk%'
   and s.scheduled_date between current_date + 1 and current_date + 14
   and (s.title like 'Stopa i mobilność (A)%' or s.title = 'Siła: kolano i biodro (B)')
 order by 1, 2;
