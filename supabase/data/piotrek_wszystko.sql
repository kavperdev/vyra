-- VYRA · Piotrek: WSZYSTKO W JEDNYM. Plan 5 km na 14 marca 2027 + siła w domu jako osobne treningi + bieg mikołajkowy 6 grudnia.
-- Wklej całość w Supabase → SQL Editor i kliknij Run. Można uruchomić wiele razy: nic się nie zdubluje.
-- Część 1: plan biegowy (pomija się, jeśli plan już jest). Część 2: siła A/B i core jako osobne treningi. Część 3: bieg mikołajkowy.

-- ===== Część 1 · plan biegowy =====
do $$
declare
  v_ath   uuid;
  v_coach uuid;
  v_plan  uuid;
  v_s     uuid;
  v_n     int := 0;
  v_cnt   int;
  e       jsonb;
begin
  select count(*) into v_cnt from public.profiles
   where role = 'athlete' and (lower(trim(full_name)) = 'piotrek' or full_name ilike '%amanowicz%');
  if v_cnt = 0 then
    raise exception 'Nie znaleziono konta ZAWODNIKA o nazwie „Piotrek”. Sprawdź nazwę konta w panelu trenera.';
  elsif v_cnt > 1 then
    raise exception 'Jest kilka kont zawodników o nazwie „Piotrek”. Napisz, które jest właściwe (np. e-mail).';
  end if;
  select id into v_ath from public.profiles
   where role = 'athlete' and (lower(trim(full_name)) = 'piotrek' or full_name ilike '%amanowicz%');

  select ca.coach_id into v_coach
    from public.coach_athletes ca join public.profiles p on p.id = ca.coach_id
   where ca.athlete_id = v_ath and ca.status = 'active'
   order by (p.staff_role = 'founder') desc, ca.created_at limit 1;
  if v_coach is null then
    raise exception 'Piotrek nie ma aktywnego trenera. Dodaj go w panelu trenera i uruchom ponownie.';
  end if;

  if exists (select 1 from public.training_plans where athlete_id = v_ath and name = 'Plan 5 km · 14 marca 2027') then
    raise notice 'Plan już jest, przechodzę dalej.';
    return;
  end if;

  perform set_config('vyra.bulk', 'on', true);

  insert into public.training_plans (coach_id, athlete_id, name, description, goal, start_date, end_date)
  values (v_coach, v_ath, 'Plan 5 km · 14 marca 2027',
          '17 tygodni: powrót, baza i próg, wytrzymałość szybkościowa, blok 5 km, taper. 4 stałe dni + 1 opcjonalny. Siła w domu 2× w tygodniu.',
          '5 km poniżej 18:00 (17:40-17:50) 14 marca 2027',
          date '2026-11-16', date '2027-03-14')
  returning id into v_plan;

  for e in select * from jsonb_array_elements('[{"date": "2026-11-16", "title": "(opcjonalnie) Easy 6 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 6, "instr": "6 km easy (5:20-6:00, tętno poniżej 152) + 4 przebieżki 100 m", "notes": "Tydzień 1 z 17 · Faza 0 · Powrót. Spokojny start po biegu 11 listopada. Akcent tylko w czwartek i lekki."}, {"date": "2026-11-17", "title": "Easy 8 km + przebieżki + siła A", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek 100 m · Siła A (2 serie, technika)", "notes": "Tydzień 1 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-19", "title": "6×2 min w 4:10 + siła B", "cat": "intervals", "struct": "intervals", "km": 8, "instr": "2 km + 6×2 min w 4:10 (1 min trucht) + 2 km · Siła B (2 serie, lekko)", "notes": "Tydzień 1 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-21", "title": "Easy 7 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy w terenie + 6×8 s pod górę (pełna przerwa, marsz w dół)", "notes": "Tydzień 1 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-22", "title": "Długi bieg 12 km", "cat": "long", "struct": "continuous", "km": 12, "instr": "12 km spokojnie (5:20-5:50)", "notes": "Tydzień 1 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-23", "title": "(opcjonalnie) Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 4 przebieżki 100 m", "notes": "Tydzień 2 z 17 · Faza 0 · Powrót. Pierwszy próg we wtorek. Tempo z zapasem: kończysz z uczuciem, że dałbyś radę jeszcze 2 odcinki."}, {"date": "2026-11-24", "title": "5×1000 m w 4:08 + siła A", "cat": "threshold", "struct": "intervals", "km": 9, "instr": "2 km + 5×1000 m w 4:08-4:12 (1 min trucht) + 2 km · Siła A (2 serie)", "notes": "Tydzień 2 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-26", "title": "Fartlek 8×1 min + siła B", "cat": "fartlek", "struct": "fartlek", "km": 9, "instr": "2 km + 8×(1 min w 3:50 / 1 min lekko) + 2 km · Siła B", "notes": "Tydzień 2 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-28", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 8×8 s pod górę", "notes": "Tydzień 2 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-29", "title": "Długi bieg 13 km", "cat": "long", "struct": "continuous", "km": 13, "instr": "13 km spokojnie (5:20-5:50)", "notes": "Tydzień 2 z 17 · Faza 0 · Powrót."}, {"date": "2026-11-30", "title": "(opcjonalnie) Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 4 przebieżki", "notes": "Tydzień 3 z 17 · Faza 0 · Powrót. Test 3 km w sobotę. Wynik przelicza tempa na grudzień."}, {"date": "2026-12-01", "title": "3×2000 m w 4:05 + siła A", "cat": "threshold", "struct": "intervals", "km": 10, "instr": "2 km + 3×2000 m w 4:05-4:08 (90 s trucht) + 2 km · Siła A", "notes": "Tydzień 3 z 17 · Faza 0 · Powrót."}, {"date": "2026-12-03", "title": "Easy 7 km + przebieżki + siła B", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 6 przebieżek 100 m · Siła B (lekko)", "notes": "Tydzień 3 z 17 · Faza 0 · Powrót."}, {"date": "2026-12-05", "title": "TEST 3 km", "cat": "test", "struct": "continuous", "km": 8, "instr": "3 km rozgrzewki + 4 przebieżki + 3 km maksymalnie równo (oczekiwane 10:30-10:45) + 2 km schłodzenia", "notes": "Tydzień 3 z 17 · Faza 0 · Powrót."}, {"date": "2026-12-06", "title": "Długi bieg 12 km", "cat": "long", "struct": "continuous", "km": 12, "instr": "12 km spokojnie", "notes": "Tydzień 3 z 17 · Faza 0 · Powrót."}, {"date": "2026-12-07", "title": "(opcjonalnie) Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 6 przebieżek", "notes": "Tydzień 4 z 17 · Faza A · Baza i próg. Wchodzi czwartkowy fartlek. Tempa progu skoryguj po teście 3 km."}, {"date": "2026-12-08", "title": "4×1600 m w 4:02 + siła A", "cat": "threshold", "struct": "intervals", "km": 11, "instr": "3 km + 4×1600 m w 4:02-4:05 (1 min trucht) + 2 km · Siła A (3 serie)", "notes": "Tydzień 4 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-10", "title": "Fartlek 6×(2 min + 30 s) + siła B", "cat": "fartlek", "struct": "fartlek", "km": 10, "instr": "3 km + 6×(2 min w 3:45 + 30 s w 3:25), 1 min lekko między + 2 km · Siła B", "notes": "Tydzień 4 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-12", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 8×10 s pod górę", "notes": "Tydzień 4 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-13", "title": "Długi bieg 14 km", "cat": "long", "struct": "continuous", "km": 14, "instr": "14 km spokojnie", "notes": "Tydzień 4 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-14", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 5 z 17 · Faza A · Baza i próg. Fartlek progowy: równe tempo progu z krótkimi przyspieszeniami."}, {"date": "2026-12-15", "title": "Fartlek progowy 4×(5 min + 1 min) + siła A", "cat": "threshold", "struct": "fartlek", "km": 12, "instr": "3 km + 4×(5 min w 4:00 + 1 min w 3:40), 1 min lekko między + 2 km · Siła A", "notes": "Tydzień 5 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-17", "title": "Szybkość 8×200 m + siła B", "cat": "intervals", "struct": "intervals", "km": 8, "instr": "3 km + 8×200 m w 39-40 s (200 m trucht) + 2 km · Siła B", "notes": "Tydzień 5 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-19", "title": "Easy 9 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 9, "instr": "9 km easy w terenie + 8×10 s pod górę", "notes": "Tydzień 5 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-20", "title": "Długi bieg 15 km", "cat": "long", "struct": "continuous", "km": 15, "instr": "15 km spokojnie", "notes": "Tydzień 5 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-22", "title": "5×1000 m w 4:02 + siła A", "cat": "threshold", "struct": "intervals", "km": 9, "instr": "2 km + 5×1000 m w 4:02 (1 min trucht) + 2 km · Siła A (lekko, 2 serie)", "notes": "Tydzień 6 z 17 · Faza A · Baza i próg. Tydzień lżejszy (święta). Dni przesuwaj swobodnie, ważne, żeby został 1 pełny dzień wolny."}, {"date": "2026-12-24", "title": "Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 6 przebieżek", "notes": "Tydzień 6 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-26", "title": "Easy 6 km + 6×20 s szybko", "cat": "easy", "struct": "continuous", "km": 6, "instr": "6 km easy + 6×20 s w 3:20 / 90 s lekko", "notes": "Tydzień 6 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-27", "title": "Długi bieg 12 km", "cat": "long", "struct": "continuous", "km": 12, "instr": "12 km spokojnie", "notes": "Tydzień 6 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-28", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 7 z 17 · Faza A · Baza i próg. Dłuższe odcinki progowe. Piątek 1 stycznia wolny."}, {"date": "2026-12-29", "title": "3×2500 m w 4:00 + siła A", "cat": "threshold", "struct": "intervals", "km": 12, "instr": "3 km + 3×2500 m w 4:00-4:03 (1 min trucht) + 2 km · Siła A", "notes": "Tydzień 7 z 17 · Faza A · Baza i próg."}, {"date": "2026-12-31", "title": "Mona fartlek + siła B", "cat": "fartlek", "struct": "fartlek", "km": 11, "instr": "3 km + 2×(90 s, 90 s, 60 s, 60 s, 30 s, 30 s) w tempie 3:45, 3:45, 3:35, 3:35, 3:25, 3:25; przerwa lekko równa czasowi odcinka, 3 min między seriami + 2 km · Siła B", "notes": "Tydzień 7 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-02", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 8×10 s pod górę", "notes": "Tydzień 7 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-03", "title": "Długi bieg 16 km", "cat": "long", "struct": "continuous", "km": 16, "instr": "16 km spokojnie", "notes": "Tydzień 7 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-04", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 8 z 17 · Faza A · Baza i próg. Szczyt fazy A: najdłuższy bieg bazy."}, {"date": "2027-01-05", "title": "4×2000 m w 3:58 + siła A", "cat": "threshold", "struct": "intervals", "km": 13, "instr": "3 km + 4×2000 m w 3:58-4:00 (1 min trucht) + 2 km · Siła A", "notes": "Tydzień 8 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-07", "title": "Szybkość 6×300 m + siła B", "cat": "intervals", "struct": "intervals", "km": 8, "instr": "3 km + 6×300 m w 60-62 s (3 min przerwy, marsz/trucht) + 2 km · Siła B", "notes": "Tydzień 8 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-09", "title": "Easy 9 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 9, "instr": "9 km easy w terenie + 8×10 s pod górę", "notes": "Tydzień 8 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-10", "title": "Długi bieg 17 km", "cat": "long", "struct": "continuous", "km": 17, "instr": "17 km spokojnie (skróć do 15 km, jeśli nogi są ciężkie)", "notes": "Tydzień 8 z 17 · Faza A · Baza i próg."}, {"date": "2027-01-11", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 9 z 17 · Faza B · Wytrzymałość szybkościowa. Wtorek przechodzi na VO2max, próg przenosi się na czwartek."}, {"date": "2027-01-12", "title": "5×1000 m w 3:42 + siła A", "cat": "intervals", "struct": "intervals", "km": 10, "instr": "3 km + 5×1000 m w 3:42-3:45 (2 min trucht) + 2 km · Siła A (utrzymanie)", "notes": "Tydzień 9 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-14", "title": "20 min ciągłe w 4:00 + siła B", "cat": "threshold", "struct": "continuous", "km": 10, "instr": "3 km + 20 min ciągłe w 4:00 + 2 km · Siła B", "notes": "Tydzień 9 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-16", "title": "Easy 8 km + podbiegi 6×60 s", "cat": "hills", "struct": "intervals", "km": 9, "instr": "8 km easy w terenie, w środku 6×60 s pod górę (RPE 8, trucht w dół)", "notes": "Tydzień 9 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-17", "title": "Długi bieg 16 km", "cat": "long", "struct": "continuous", "km": 16, "instr": "16 km spokojnie", "notes": "Tydzień 9 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-19", "title": "4×1000 m w 3:42 + siła A", "cat": "intervals", "struct": "intervals", "km": 9, "instr": "3 km + 4×1000 m w 3:42 (2 min trucht) + 2 km · Siła A (lekko)", "notes": "Tydzień 10 z 17 · Faza B · Wytrzymałość szybkościowa. Tydzień lżejszy + test 5 km w sobotę. Wynik decyduje: cel 17:45 czy 17:30."}, {"date": "2027-01-21", "title": "Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 4 przebieżki", "notes": "Tydzień 10 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-23", "title": "TEST 5 km", "cat": "test", "struct": "continuous", "km": 10, "instr": "3 km rozgrzewki + 4 przebieżki + 5 km równo (parkrun lub bieżnia, oczekiwane 18:10-18:30) + 2 km", "notes": "Tydzień 10 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-24", "title": "Długi bieg 12 km", "cat": "long", "struct": "continuous", "km": 12, "instr": "12 km spokojnie", "notes": "Tydzień 10 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-25", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 11 z 17 · Faza B · Wytrzymałość szybkościowa. Tempa VO2max i progu przeliczone po teście 5 km."}, {"date": "2027-01-26", "title": "6×1000 m w 3:38 + siła A", "cat": "intervals", "struct": "intervals", "km": 11, "instr": "3 km + 6×1000 m w 3:38-3:40 (2 min trucht) + 2 km · Siła A", "notes": "Tydzień 11 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-28", "title": "3×2500 m w 3:56 + siła B", "cat": "threshold", "struct": "intervals", "km": 12, "instr": "3 km + 3×2500 m w 3:56-3:58 (1 min trucht) + 2 km · Siła B", "notes": "Tydzień 11 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-30", "title": "Easy 8 km + podbiegi 8×60 s", "cat": "hills", "struct": "intervals", "km": 9, "instr": "8 km easy w terenie, w środku 8×60 s pod górę (RPE 8, trucht w dół)", "notes": "Tydzień 11 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-01-31", "title": "Długi bieg 16 km", "cat": "long", "struct": "continuous", "km": 16, "instr": "16 km spokojnie", "notes": "Tydzień 11 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-02-01", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 12 z 17 · Faza B · Wytrzymałość szybkościowa. Szczyt fazy B."}, {"date": "2027-02-02", "title": "5×1200 m w 3:38 + siła A", "cat": "intervals", "struct": "intervals", "km": 11, "instr": "3 km + 5×1200 m w 3:36-3:38 (2:30 trucht) + 2 km · Siła A", "notes": "Tydzień 12 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-02-04", "title": "Fartlek progowy 3×(4+2+1 min) + siła B", "cat": "threshold", "struct": "fartlek", "km": 12, "instr": "3 km + 3×(4 min w 3:55 + 2 min w 3:40 + 1 min w 3:32), 2 min lekko między + 2 km · Siła B", "notes": "Tydzień 12 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-02-06", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 8×10 s pod górę", "notes": "Tydzień 12 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-02-07", "title": "Długi bieg 17 km", "cat": "long", "struct": "continuous", "km": 17, "instr": "17 km spokojnie", "notes": "Tydzień 12 z 17 · Faza B · Wytrzymałość szybkościowa."}, {"date": "2027-02-08", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 13 z 17 · Faza C · Blok 5 km. Pierwszy tydzień tempa startowego."}, {"date": "2027-02-09", "title": "6×1000 m w 3:34 + siła A", "cat": "race_pace", "struct": "intervals", "km": 11, "instr": "3 km + 6×1000 m w 3:34-3:35 (2 min trucht) + 2 km · Siła A (utrzymanie)", "notes": "Tydzień 13 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-11", "title": "20 min ciągłe w 3:55 + siła B", "cat": "threshold", "struct": "continuous", "km": 10, "instr": "3 km + 20 min ciągłe w 3:55 + 2 km · Siła B", "notes": "Tydzień 13 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-13", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 6×10 s pod górę", "notes": "Tydzień 13 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-14", "title": "Długi bieg 16 km", "cat": "long", "struct": "continuous", "km": 16, "instr": "16 km spokojnie", "notes": "Tydzień 13 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-16", "title": "5×1000 m w 3:52 + siła A", "cat": "threshold", "struct": "intervals", "km": 10, "instr": "3 km + 5×1000 m w 3:52 (1 min trucht) + 2 km · Siła A (lekko)", "notes": "Tydzień 14 z 17 · Faza C · Blok 5 km. Tydzień lżejszy + kontrolne 3 km w sobotę: ostatnia korekta tempa startowego."}, {"date": "2027-02-18", "title": "Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 6 przebieżek", "notes": "Tydzień 14 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-20", "title": "TEST 3 km kontrolne", "cat": "test", "struct": "continuous", "km": 8, "instr": "3 km rozgrzewki + 4 przebieżki + 3 km równo (oczekiwane 10:10-10:20) + 2 km", "notes": "Tydzień 14 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-21", "title": "Długi bieg 13 km", "cat": "long", "struct": "continuous", "km": 13, "instr": "13 km spokojnie", "notes": "Tydzień 14 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-22", "title": "(opcjonalnie) Easy 8 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy + 6 przebieżek", "notes": "Tydzień 15 z 17 · Faza C · Blok 5 km. Ostatni mocny tydzień. Od teraz szlifujemy, nie budujemy."}, {"date": "2027-02-23", "title": "6×1000 m w 3:31 + siła A", "cat": "race_pace", "struct": "intervals", "km": 11, "instr": "3 km + 6×1000 m w 3:30-3:32 (2 min trucht) + 2 km · Siła A (2 serie, lekko)", "notes": "Tydzień 15 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-25", "title": "12×400 m w 83 s + siła B", "cat": "race_pace", "struct": "intervals", "km": 12, "instr": "3 km + 12×400 m w 82-84 s (200 m trucht) + 2 km · Siła B", "notes": "Tydzień 15 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-27", "title": "Easy 8 km w terenie + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 8, "instr": "8 km easy w terenie + 6×10 s pod górę", "notes": "Tydzień 15 z 17 · Faza C · Blok 5 km."}, {"date": "2027-02-28", "title": "Długi bieg 15 km", "cat": "long", "struct": "continuous", "km": 15, "instr": "15 km spokojnie", "notes": "Tydzień 15 z 17 · Faza C · Blok 5 km."}, {"date": "2027-03-01", "title": "(opcjonalnie) Easy 7 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 4 przebieżki", "notes": "Tydzień 16 z 17 · Faza D · Taper. Mniej kilometrów, tempo zostaje. Siła tylko lekko."}, {"date": "2027-03-02", "title": "3×(2×800 m w 2:46) + siła A", "cat": "race_pace", "struct": "intervals", "km": 10, "instr": "3 km + 3×(2×800 m w 2:45-2:47), 200 m trucht, 3 min między seriami + 2 km · Siła A (lekko)", "notes": "Tydzień 16 z 17 · Faza D · Taper."}, {"date": "2027-03-04", "title": "2×2000 m w 3:52 + siła B", "cat": "threshold", "struct": "intervals", "km": 9, "instr": "3 km + 2×2000 m w 3:50-3:52 (2 min trucht) + 2 km · Siła B (tylko core)", "notes": "Tydzień 16 z 17 · Faza D · Taper."}, {"date": "2027-03-06", "title": "Easy 7 km + sprinty pod górę", "cat": "easy", "struct": "continuous", "km": 7, "instr": "7 km easy + 6×10 s pod górę", "notes": "Tydzień 16 z 17 · Faza D · Taper."}, {"date": "2027-03-07", "title": "Długi bieg 12 km", "cat": "long", "struct": "continuous", "km": 12, "instr": "12 km spokojnie", "notes": "Tydzień 16 z 17 · Faza D · Taper."}, {"date": "2027-03-08", "title": "(opcjonalnie) Easy 6 km + przebieżki", "cat": "easy", "struct": "continuous", "km": 6, "instr": "6 km easy + 4 przebieżki", "notes": "Tydzień 17 z 17 · Faza D · Taper i start. START 5 km w niedzielę 14 marca. Plan: 1. km w 3:34, 2-4 km w 3:32, ostatni na ile masz sił."}, {"date": "2027-03-09", "title": "3×1000 m w 3:32", "cat": "race_pace", "struct": "intervals", "km": 8, "instr": "3 km + 3×1000 m w 3:31-3:32 (3 min trucht) + 2 km", "notes": "Tydzień 17 z 17 · Faza D · Taper i start."}, {"date": "2027-03-11", "title": "Easy 6 km + 4×300 m", "cat": "easy", "struct": "continuous", "km": 7, "instr": "6 km easy + 4×300 m w 62 s (pełna przerwa) · tylko core 15 min", "notes": "Tydzień 17 z 17 · Faza D · Taper i start."}, {"date": "2027-03-13", "title": "20 min easy + przebieżki", "cat": "easy", "struct": "continuous", "km": 4, "instr": "20 min easy + 4 przebieżki", "notes": "Tydzień 17 z 17 · Faza D · Taper i start."}, {"date": "2027-03-14", "title": "START 5 km", "cat": "race", "struct": "continuous", "km": 9, "instr": "15-20 min rozgrzewki, skipy, 4 przebieżki (ostatnia 6 min przed startem), START 5 km (cel 17:40-17:50: 1. km 3:34, 2-4 km 3:32, ostatni na ile masz sił), schłodzenie", "notes": "Tydzień 17 z 17 · Faza D · Taper i start."}]'::jsonb) loop
    insert into public.training_sessions (coach_id, athlete_id, plan_id, kind, category, title, scheduled_date, instructions, notes)
    values (v_coach, v_ath, v_plan, 'running', e->>'cat', e->>'title', (e->>'date')::date, e->>'instr', e->>'notes')
    returning id into v_s;
    insert into public.running_workouts (session_id, structure, planned_distance_m)
    values (v_s, e->>'struct', nullif(e->>'km', '')::int * 1000);
    v_n := v_n + 1;
  end loop;

  perform set_config('vyra.bulk', '', true);
  perform public.notify(v_ath, 'session_assigned', 'Nowy plan: 5 km · 14 marca 2027',
    v_n || ' treningów · od 16.11.2026', '/athlete/calendar', null);
  raise notice 'Dodano % treningów.', v_n;
end $$;

-- ===== Część 2 · siła w domu jako osobne treningi =====
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

-- ===== Część 3 · bieg mikołajkowy 6 grudnia =====
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
