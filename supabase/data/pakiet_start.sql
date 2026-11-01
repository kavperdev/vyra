-- VYRA · pakiet „Start” dla początkujących (np. z Run Clubu). Uruchom raz; ponowne uruchomienie nic nie zdubluje.
insert into public.coaching_plans (name, name_en, tagline, tagline_en, kind, price_pln, features, features_en, badge, badge_en, highlighted, sort)
select 'Start', 'Start',
  'Pierwsze 8 tygodni biegania z planem. Od zera albo od Run Clubu do 5 km.',
  'Your first 8 weeks of running with a plan. From zero or from Run Club to 5K.',
  'once', 99,
  E'Plan na 8 tygodni od marszobiegu do 5 km\nTempa i tętno dopasowane do Ciebie\nPlatforma VYRA na telefonie\nJedna rozmowa wideo na start\nZniżka na przejście do Foundation',
  E'8-week plan from run-walk to 5K\nPaces and heart rate matched to you\nVYRA platform on your phone\nOne video call to start\nDiscount when moving up to Foundation',
  'Dla początkujących', 'For beginners', false, 5
where not exists (select 1 from public.coaching_plans where name = 'Start');
