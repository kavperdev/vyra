-- VYRA · English version of the brand site: translated fields edited in the panel.
-- Empty English fields fall back to the Polish text.

alter table public.camps
  add column if not exists title_en text check (char_length(title_en) <= 160),
  add column if not exists summary_en text check (char_length(summary_en) <= 600),
  add column if not exists description_en text check (char_length(description_en) <= 20000),
  add column if not exists included_en text check (char_length(included_en) <= 3000);

alter table public.coaching_plans
  add column if not exists name_en text check (char_length(name_en) <= 60),
  add column if not exists tagline_en text check (char_length(tagline_en) <= 200),
  add column if not exists features_en text check (char_length(features_en) <= 3000),
  add column if not exists badge_en text check (char_length(badge_en) <= 40);

alter table public.site_team
  add column if not exists role_label_en text check (char_length(role_label_en) <= 120),
  add column if not exists bio_en text check (char_length(bio_en) <= 1200),
  add column if not exists areas_en text check (char_length(areas_en) <= 300);

-- Articles are written in one language; the journal shows the visitor's language first.
alter table public.articles
  add column if not exists lang text not null default 'pl' check (lang in ('pl', 'en'));

-- Default packages in English (only where nothing was entered yet).
update public.coaching_plans set
  tagline_en = coalesce(tagline_en, case name
    when 'Foundation' then 'A plan and direction for runners who want to train smarter.'
    when 'Performance' then 'Full coaching towards a personal best or a goal race.'
    when 'Elite' then 'The closest work with your coach. Limited places.'
    when 'Konsultacja' then 'An hour with a coach: training review, zones and direction.'
    when 'Plan startowy 12 tygodni' then 'A ready plan for your race, without ongoing coaching.' end),
  name_en = coalesce(name_en, case name
    when 'Konsultacja' then 'Consultation'
    when 'Plan startowy 12 tygodni' then '12-week race plan' end),
  badge_en = coalesce(badge_en, case badge
    when 'Najczęściej wybierany' then 'Most popular'
    when 'Tylko 5 miejsc' then 'Only 5 places' end),
  features_en = coalesce(features_en, case name
    when 'Foundation' then E'Individual plan written rep by rep\nPace and heart-rate zones from your results\nWeekly review and plan adjustment\nVYRA platform on phone and desktop\nCoach reply within 48 hours'
    when 'Performance' then E'Everything in Foundation\nReview and comment on every session\nStrength training built for running\nMonthly video call\nRace strategy and pacing for your goal race\nCoach reply within 24 hours'
    when 'Elite' then E'Everything in Performance\nVideo call every two weeks\nDirect day-to-day contact with your coach\nRunning technique analysis from video\nRecovery and race-nutrition plan\nPriority booking and a discount on VYRA camps'
    when 'Konsultacja' then E'60-minute video call\nReview of your recent training\nPace and heart-rate zones\nWritten recommendations after the call'
    when 'Plan startowy 12 tygodni' then E'12-week plan for a 5K, 10K or half marathon\nFitted to your level and schedule\nPaces and zones in the VYRA platform\nOne plan adjustment along the way' end);

update public.site_team set
  role_label_en = coalesce(role_label_en, case role_label
    when 'Trener biegowy · Współzałożyciel' then 'Running coach · Co-founder'
    when 'Trener przygotowania siłowego · Współzałożyciel' then 'Strength & conditioning coach · Co-founder'
    when 'Fizjoterapeuta' then 'Physiotherapist' end),
  bio_en = coalesce(bio_en, case bio
    when 'Odpowiada za planowanie treningu biegowego, periodyzację i analizę wyników zawodników w platformie VYRA.'
      then 'Responsible for running programming, periodisation and analysing athletes’ results in the VYRA platform.'
    when 'Odpowiada za trening siłowy i motoryczny, budowanie odporności na kontuzje i ekonomię ruchu.'
      then 'Responsible for strength and conditioning, building resilience to injury and movement economy.'
    when 'Odpowiada za diagnostykę, profilaktykę urazów i regenerację zawodników.'
      then 'Responsible for assessment, injury prevention and athletes’ recovery.' end),
  areas_en = coalesce(areas_en, case areas
    when 'Periodyzacja, Strefy tempa i tętna, Przygotowanie startowe' then 'Periodisation, Pace and heart-rate zones, Race preparation'
    when 'Siła i moc, Stabilizacja, Ekonomia ruchu' then 'Strength and power, Stability, Movement economy'
    when 'Diagnostyka, Profilaktyka urazów, Regeneracja' then 'Assessment, Injury prevention, Recovery' end);
