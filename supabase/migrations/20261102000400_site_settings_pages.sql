-- VYRA · company details and legal pages editable from the founder panel. Safe to run more than once.

create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  controller  text check (char_length(controller) <= 120),
  address     text check (char_length(address) <= 200),
  tax_id      text check (char_length(tax_id) <= 40),
  email       text check (char_length(email) <= 120),
  phone       text check (char_length(phone) <= 40),
  instagram   text check (char_length(instagram) <= 60),
  updated_at  timestamptz not null default now()
);

create table if not exists public.site_pages (
  slug        text primary key check (slug in ('regulamin', 'polityka-prywatnosci')),
  body        text check (char_length(body) <= 40000),
  body_en     text check (char_length(body_en) <= 40000),
  updated_at  timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.site_pages enable row level security;
drop policy if exists site_settings_public on public.site_settings;
drop policy if exists site_settings_founders on public.site_settings;
drop policy if exists site_pages_public on public.site_pages;
drop policy if exists site_pages_founders on public.site_pages;
create policy site_settings_public on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_founders on public.site_settings for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy site_pages_public on public.site_pages for select to anon, authenticated using (true);
create policy site_pages_founders on public.site_pages for all to authenticated using (public.is_founder()) with check (public.is_founder());
grant select on public.site_settings, public.site_pages to anon;
grant select, insert, update, delete on public.site_settings, public.site_pages to authenticated;
