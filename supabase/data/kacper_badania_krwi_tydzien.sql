-- VYRA · Kacper Adamczyk: tydzień z badaniem krwi (wtorek 17 listopada 2026).
-- Nd 15.11: zamiast longa wolne albo 30-40 min bardzo spokojnie. Pn 16.11: easy bez przebieżek.
-- Wt 17.11: rano badanie krwi, akcent po południu. Śr 18.11: long skrócony zamiast easy.
-- Uruchom w Supabase → SQL Editor. Zmienia tylko treningi, które nie mają jeszcze zapisanego wykonania.

do $$
declare
  v_ath  uuid;
  v_coach uuid;
  v_plan uuid;
  v_s    uuid;
  v_n    int := 0;
  v_c    int;
begin
  select id into v_ath from public.profiles
   where role = 'athlete' and lower(trim(full_name)) = lower('Kacper Adamczyk') order by created_at limit 1;
  if v_ath is null then raise exception 'Nie znaleziono konta zawodnika „Kacper Adamczyk”.'; end if;

  select id, coach_id into v_plan, v_coach from public.training_plans
   where athlete_id = v_ath order by (name = 'Plan biegowy 2026/27') desc, created_at desc limit 1;

  -- Niedziela 15.11: zamiast longa.
  update public.training_sessions
     set title = 'Wolne albo 30-40 min bardzo spokojnie', category = 'recovery',
         instructions = 'Long przesunięty na środę (badanie krwi we wtorek rano). Dziś odpoczynek albo 30-40 min bardzo spokojnie, nie dłużej.',
         notes = coalesce(notes || ' ', '') || 'Zmiana: long przeniesiony na środę 18.11.'
   where athlete_id = v_ath and scheduled_date = date '2026-11-15' and kind = 'running' and status = 'planned'
     and category = 'long';
  get diagnostics v_c = row_count; v_n := v_n + v_c;
  update public.running_workouts set planned_distance_m = 6000
   where session_id in (select id from public.training_sessions
                         where athlete_id = v_ath and scheduled_date = date '2026-11-15' and kind = 'running' and category = 'recovery');

  -- Poniedziałek 16.11: easy bez przebieżek + przygotowanie do badania.
  update public.training_sessions
     set title = regexp_replace(title, '\s*\+\s*przebieżki', '', 'i'),
         instructions = regexp_replace(instructions, '\s*\+\s*\d+\s*przebieżek[^·]*', '', 'i')
                        || ' · Bez przebieżek, spokojnie.',
         notes = coalesce(notes || ' ', '') || 'Jutro rano badanie krwi: kolacja do 19-20, bez alkoholu i suplementów, wodę pij normalnie.'
   where athlete_id = v_ath and scheduled_date = date '2026-11-16' and kind = 'running' and status = 'planned'
     and coalesce(notes, '') not like '%Jutro rano badanie krwi%';
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  -- Wtorek 17.11: badanie rano, akcent po południu.
  update public.training_sessions
     set notes = 'RANO: badanie krwi na czczo (Diagnostyka, Kochanowskiego 8, od 7:00). Akcent dopiero po południu, min. 3 h po pobraniu i po normalnym posiłku. Jeśli po pobraniu czujesz się słabo: zamień na easy. '
                 || coalesce(notes, '')
   where athlete_id = v_ath and scheduled_date = date '2026-11-17' and kind = 'running' and status = 'planned'
     and coalesce(notes, '') not like 'RANO: badanie krwi%';
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  -- Badanie krwi jako osobna pozycja w kalendarzu.
  if not exists (select 1 from public.training_sessions
                  where athlete_id = v_ath and scheduled_date = date '2026-11-17' and kind = 'other' and title like 'Badanie krwi%') then
    insert into public.training_sessions (coach_id, athlete_id, plan_id, kind, category, title, scheduled_date, scheduled_time,
                                          goal, instructions, notes)
    values (v_coach, v_ath, v_plan, 'other', 'other', 'Badanie krwi (Diagnostyka)', date '2026-11-17', time '07:00',
            'Ferrytyna, morfologia, TSH, FT4, anty-TPO, CRP, sód i potas, kreatynina.',
            'Diagnostyka, ul. Kochanowskiego 8, Siedlce (pon.-pt. od 7:00). Na czczo, wodę można pić. Po pobraniu normalne śniadanie.',
            'Wyniki zwykle w 1-2 dni robocze w „Wyniki online” na diag.pl.');
    v_n := v_n + 1;
  end if;

  -- Środa 18.11: long skrócony zamiast easy.
  select id into v_s from public.training_sessions
   where athlete_id = v_ath and scheduled_date = date '2026-11-18' and kind = 'running' and status = 'planned'
     and category = 'easy' limit 1;
  if v_s is not null then
    update public.training_sessions
       set title = 'Długi bieg 15 km (przesunięty z niedzieli)', category = 'long',
           instructions = '15 km easy, spokojnie. To skrócony niedzielny long (ok. 3/4 dystansu), żeby czwartek był na świeżych nogach.',
           notes = coalesce(notes || ' ', '') || 'Zmiana: long przeniesiony z 15.11 i skrócony.'
     where id = v_s;
    update public.running_workouts set planned_distance_m = 15000, structure = 'continuous' where session_id = v_s;
    v_n := v_n + 1;
  end if;

  raise notice 'Zmieniono lub dodano % pozycji.', v_n;
end $$;
