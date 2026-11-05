-- VYRA · Run Club sign-ups: where the person came from (short links /rc/<kanal>) and consent to photos.
-- Safe to run more than once.

alter table public.run_club_signups add column if not exists source text check (char_length(source) <= 60);
alter table public.run_club_signups add column if not exists photo_consent boolean not null default false;
