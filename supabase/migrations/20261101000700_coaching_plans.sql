-- VYRA · coaching packages sold on /prowadzenie (edited by founders in the panel)
-- Safe to run more than once: re-running restores the default packages.

create table if not exists public.coaching_plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 60),
  tagline           text check (char_length(tagline) <= 200),
  kind              text not null default 'monthly' check (kind in ('monthly', 'once')),
  price_pln         int not null check (price_pln between 0 and 100000),
  commit_price_pln  int check (commit_price_pln between 0 and 100000),
  features          text check (char_length(features) <= 3000),
  badge             text check (char_length(badge) <= 40),
  highlighted       boolean not null default false,
  visible           boolean not null default true,
  sort              int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists coaching_plans_updated on public.coaching_plans;
create trigger coaching_plans_updated before update on public.coaching_plans
  for each row execute function public.set_updated_at();

alter table public.coaching_plans enable row level security;
drop policy if exists coaching_plans_public_select on public.coaching_plans;
drop policy if exists coaching_plans_founder_write on public.coaching_plans;
create policy coaching_plans_public_select on public.coaching_plans for select to anon, authenticated
  using (visible or public.is_founder());
create policy coaching_plans_founder_write on public.coaching_plans for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
grant select on public.coaching_plans to anon;
grant select, insert, update, delete on public.coaching_plans to authenticated;

-- The chosen package is stored by name, so packages can be renamed or added freely.
alter table public.applications drop constraint if exists applications_package_check;
alter table public.applications add constraint applications_package_check
  check (package is null or char_length(package) <= 80);

delete from public.coaching_plans
  where name in ('Foundation', 'Performance', 'Elite', 'Konsultacja', 'Plan startowy 12 tygodni');

insert into public.coaching_plans (name, tagline, kind, price_pln, commit_price_pln, features, badge, highlighted, sort) values
  ('Foundation', 'Plan i kierunek dla biegaczy, którzy chcą trenować mądrzej.', 'monthly', 199, 179,
   E'Indywidualny plan rozpisany co do odcinka\nStrefy tempa i tętna z Twoich wyników\nCotygodniowe podsumowanie i korekta planu\nPlatforma VYRA na telefonie i komputerze\nOdpowiedź trenera do 48 godzin',
   null, false, 10),
  ('Performance', 'Pełne prowadzenie pod rekord życiowy lub start docelowy.', 'monthly', 299, 269,
   E'Wszystko z pakietu Foundation\nAnaliza i komentarz do każdego treningu\nTrening siłowy dopasowany do biegania\nRozmowa wideo raz w miesiącu\nStrategia i tempo na start docelowy\nOdpowiedź trenera do 24 godzin',
   'Najczęściej wybierany', true, 20),
  ('Elite', 'Najbliższa współpraca z trenerem. Ograniczona liczba miejsc.', 'monthly', 449, 399,
   E'Wszystko z pakietu Performance\nRozmowa wideo co dwa tygodnie\nBezpośredni kontakt z trenerem na co dzień\nAnaliza techniki biegu z nagrania wideo\nPlan regeneracji i żywienia startowego\nPierwszeństwo zapisów i rabat na obozy VYRA',
   'Tylko 5 miejsc', false, 30),
  ('Konsultacja', 'Godzina z trenerem: analiza treningu, strefy i kierunek pracy.', 'once', 129, null,
   E'Rozmowa wideo 60 minut\nAnaliza Twoich ostatnich treningów\nStrefy tempa i tętna\nPisemne zalecenia po rozmowie',
   null, false, 40),
  ('Plan startowy 12 tygodni', 'Gotowy plan pod Twój start, bez stałego prowadzenia.', 'once', 349, null,
   E'Plan na 12 tygodni pod 5 km, 10 km lub półmaraton\nDopasowany do Twojego poziomu i kalendarza\nTempa ze strefami w platformie VYRA\nJedna korekta planu w trakcie',
   null, false, 50);
