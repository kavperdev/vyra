-- VYRA · clubs of every sport (football, swimming, martial arts, volleyball …), not only athletics.
-- Safe to run more than once.
--
-- sport_clubs.sport       which sport the club runs; picks its fitness tests in the development card.
-- fitness_results.test_key now any test from the app's catalogue (lower-case key), not a fixed list.

alter table public.sport_clubs add column if not exists sport text not null default 'athletics';
alter table public.sport_clubs drop constraint if exists sport_clubs_sport_check;
alter table public.sport_clubs add constraint sport_clubs_sport_check check (sport in (
  'athletics', 'football', 'swimming', 'martial_arts', 'volleyball', 'basketball', 'handball', 'tennis', 'gymnastics', 'other'));

alter table public.fitness_results drop constraint if exists fitness_results_test_key_check;
alter table public.fitness_results add constraint fitness_results_test_key_check check (test_key ~ '^[a-z0-9_]{2,40}$');
