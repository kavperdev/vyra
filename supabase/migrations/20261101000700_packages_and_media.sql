-- VYRA · coaching packages and site photos managed from the panel

-- ---------------------------------------------------------------- coaching packages
create table public.site_packages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  tagline      text check (char_length(tagline) <= 160),
  price_pln    int check (price_pln between 0 and 1000000),
  period       text not null default 'month' check (period in ('month', 'once', 'cycle')),
  features     text check (char_length(features) <= 3000),
  highlighted  boolean not null default false,
  sort         int not null default 0,
  visible      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger site_packages_updated before update on public.site_packages
  for each row execute function public.set_updated_at();

insert into public.site_packages (name, tagline, price_pln, period, features, highlighted, sort) values
  ('VYRA Plan', 'Dla samodzielnych, którzy chcą trenować z głową', 249, 'cycle',
   E'Indywidualny plan na 4 tygodnie w aplikacji VYRA\nStrefy tempa i tętna wyliczone z Twojego wyniku\nTrening biegowy i siłowy w jednym planie\nAktualizacja planu na kolejny cykl\nKontakt przez komentarze w aplikacji', false, 10),
  ('VYRA Coaching', 'Pełne prowadzenie tydzień po tygodniu', 449, 'month',
   E'Plan rozpisywany co tydzień, co do odcinka i tempa\nAnaliza każdego treningu i komentarz trenera\nKorekta planu na bieżąco: zmęczenie, choroba, postęp\nKonsultacja wideo 30 min raz w miesiącu\nPrzygotowanie do startu docelowego', true, 20),
  ('VYRA Elite', 'Przygotowanie na poziomie zawodnika', 790, 'month',
   E'Wszystko z VYRA Coaching\nIndywidualny trening siłowy i motoryczny\nKonsultacja wideo co 2 tygodnie\nPlan startu: tempo na każdy kilometr i żywienie\nPriorytetowy kontakt z trenerem', false, 30),
  ('Plan startowy 12 tygodni', 'Jednorazowo: plan pod konkretny start', 599, 'once',
   E'12-tygodniowy plan pod Twój start i cel czasowy\nStrefy i tempa z Twojego aktualnego wyniku\nPlan w aplikacji VYRA z zapisem wyników\nJedna korekta planu w połowie cyklu', false, 40),
  ('Konsultacja 1:1', 'Godzina rozmowy o Twoim treningu', 199, 'once',
   E'Analiza Twojego obecnego treningu i wyników\nOmówienie celu i realnego czasu na start\nKonkretne zalecenia na najbliższe tygodnie', false, 50);

-- ---------------------------------------------------------------- site photos
create table public.site_media (
  slot        text primary key check (slot ~ '^[a-z0-9_]{2,40}$'),
  url         text not null check (char_length(url) <= 1000),
  alt         text check (char_length(alt) <= 200),
  updated_at  timestamptz not null default now()
);
create trigger site_media_updated before update on public.site_media
  for each row execute function public.set_updated_at();

alter table public.site_packages enable row level security;
alter table public.site_media enable row level security;
create policy site_packages_public_select on public.site_packages for select to anon, authenticated
  using (visible or public.is_founder());
create policy site_packages_founder_write on public.site_packages for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
create policy site_media_public_select on public.site_media for select to anon, authenticated using (true);
create policy site_media_founder_write on public.site_media for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
grant select on public.site_packages, public.site_media to anon;
grant select, insert, update, delete on public.site_packages, public.site_media to authenticated;

-- The chosen package is stored with a coaching inquiry (any package name from the site).
alter table public.applications drop constraint if exists applications_package_check;
alter table public.applications add constraint applications_package_check
  check (package is null or char_length(package) <= 80);

-- Public storage bucket for site photos; only founders upload or delete (Supabase Storage).
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('site', 'site', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
  execute $p$create policy "site photos public read" on storage.objects for select to anon, authenticated using (bucket_id = 'site')$p$;
  execute $p$create policy "site photos founders insert" on storage.objects for insert to authenticated with check (bucket_id = 'site' and public.is_founder())$p$;
  execute $p$create policy "site photos founders update" on storage.objects for update to authenticated using (bucket_id = 'site' and public.is_founder())$p$;
  execute $p$create policy "site photos founders delete" on storage.objects for delete to authenticated using (bucket_id = 'site' and public.is_founder())$p$;
exception when others then
  raise notice 'storage not available here: %', sqlerrm;
end $$;
