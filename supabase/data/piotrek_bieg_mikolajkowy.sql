-- VYRA · Piotrek: bieg mikołajkowy 5 km w niedzielę 6 grudnia 2026 zamiast testu 3 km.
-- Sobota 5 grudnia: luźny rozruch zamiast testu. Niedziela 6 grudnia: start 5 km zamiast długiego biegu.
-- Uruchom PO plan_5km_2027_piotr_amanowicz.sql. Ponowne uruchomienie nic nie zepsuje.

do $$
declare
  v_ath  uuid;
  v_plan uuid;
  v_s    uuid;
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and (lower(trim(full_name)) = 'piotrek' or full_name ilike '%amanowicz%')
   order by created_at limit 1;
  select id into v_plan from public.training_plans where athlete_id = v_ath and name = 'Plan 5 km · 14 marca 2027';
  if v_plan is null then raise exception 'Najpierw uruchom plan_5km_2027_piotr_amanowicz.sql.'; end if;

  -- Saturday: shake-out instead of the 3 km test.
  select id into v_s from public.training_sessions
   where plan_id = v_plan and scheduled_date = date '2026-12-05' and kind = 'running' limit 1;
  if v_s is not null then
    update public.training_sessions
       set title = 'Rozruch przed biegiem mikołajkowym', category = 'easy',
           instructions = '20-25 min easy + 4 przebieżki 100 m. Dzień przed startem: lekko i krótko.'
     where id = v_s and status = 'planned';
    update public.running_workouts set structure = 'continuous', planned_distance_m = 5000 where session_id = v_s;
  end if;

  -- Sunday: the 5 km race replaces the long run and doubles as the December test.
  select id into v_s from public.training_sessions
   where plan_id = v_plan and scheduled_date = date '2026-12-06' and kind = 'running' limit 1;
  if v_s is not null then
    update public.training_sessions
       set title = 'Bieg mikołajkowy 5 km (start kontrolny)', category = 'race',
           instructions = '15-20 min rozgrzewki, skipy, 4 przebieżki. Start 5 km mocno, ale z głową: 1. km w 3:48-3:50, potem równo, ostatni kilometr na ile masz sił. Oczekiwane 18:45-19:15. Po biegu 10-15 min truchtu.',
           notes = 'Tydzień 3 z 17 · Faza 0 · Powrót. Start nie jest celem sezonu: traktujemy go jako test zamiast 3 km. Wynik przelicza tempa na grudzień.'
     where id = v_s and status = 'planned';
    update public.running_workouts set structure = 'continuous', planned_distance_m = 9000 where session_id = v_s;
  end if;

  raise notice 'Zmieniono 5 i 6 grudnia: rozruch + bieg mikołajkowy 5 km.';
end $$;
