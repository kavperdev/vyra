-- VYRA Strażnik: pain strength (0–10) in the morning check-in, next to the existing pain flag and area.
-- Safe to run more than once.
alter table public.readiness add column if not exists pain_score smallint;
alter table public.readiness drop constraint if exists readiness_pain_score_check;
alter table public.readiness add constraint readiness_pain_score_check check (pain_score is null or pain_score between 0 and 10);
