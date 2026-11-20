-- VYRA · Kacper Adamczyk: nazwy faz w treningach planu 2026/27, żeby Sezon i Athlete OS widziały je same.
-- Do notatki każdego treningu (bieganie, siłownia, mobilność) dopisuje na początku „Faza X · Nazwa · ”.
-- Daty według obecnego planu w aplikacji (przesuniętego o tydzień względem PDF):
--   A · Baza + sub-threshold          16.11–20.12.2026 (miesiąc na 5 dni, test 3 km 19.12)
--   B · Siła biegowa                  21.12.2026–17.01.2027 (tygodnie 9–12)
--   C · Wstęp do VO2max i szybkości   18.01–21.02 (tygodnie 13–17)
--   D · Blok 5 km                     22.02–11.04 (tygodnie 18–24, start 5 km 11.04)
--   E · Przełaj                       12.04–09.05 (tygodnie 25–28, finał XC 6.05)
--   F · Powrót do progu               10.05–06.06 (tygodnie 29–32)
-- Można uruchomić kilka razy: trening, który ma już fazę w notatce, zostaje bez zmian.

do $$
declare
  v_ath uuid;
  v_n   int;
  ph    record;
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and lower(trim(full_name)) = lower('Kacper Adamczyk') order by created_at limit 1;
  if v_ath is null then raise exception 'Nie znaleziono konta zawodnika „Kacper Adamczyk”.'; end if;

  perform set_config('vyra.bulk', 'on', true);

  for ph in
    select * from (values
      ('A · Baza + sub-threshold',        date '2026-11-16', date '2026-12-20'),
      ('B · Siła biegowa',                date '2026-12-21', date '2027-01-17'),
      ('C · Wstęp do VO2max i szybkości', date '2027-01-18', date '2027-02-21'),
      ('D · Blok 5 km',                   date '2027-02-22', date '2027-04-11'),
      ('E · Przełaj',                     date '2027-04-12', date '2027-05-09'),
      ('F · Powrót do progu',             date '2027-05-10', date '2027-06-06')
    ) as t(name, d_from, d_to)
  loop
    update public.training_sessions
       set notes = left('Faza ' || ph.name || ' · ' || coalesce(notes, ''), 4000)
     where athlete_id = v_ath
       and scheduled_date between ph.d_from and ph.d_to
       and coalesce(notes, '') not like 'Faza %';
    get diagnostics v_n = row_count;
    raise notice 'Faza %: % treningów', ph.name, v_n;
  end loop;
end $$;
