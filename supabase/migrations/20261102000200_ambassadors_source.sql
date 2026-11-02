-- VYRA · ambassadors (influencer pages /z/<slug>) and where each request came from. Safe to run more than once.

create table if not exists public.ambassadors (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name         text not null check (char_length(name) between 2 and 80),
  handle       text check (char_length(handle) <= 60),
  goal         text check (char_length(goal) <= 160),
  quote        text check (char_length(quote) <= 400),
  code         text check (char_length(code) <= 40),
  discount_pct int not null default 15 check (discount_pct between 0 and 90),
  photo_url    text check (char_length(photo_url) <= 500),
  visible      boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.ambassadors enable row level security;
drop policy if exists ambassadors_public on public.ambassadors;
drop policy if exists ambassadors_founders on public.ambassadors;
create policy ambassadors_public on public.ambassadors for select to anon, authenticated using (visible or public.is_founder());
create policy ambassadors_founders on public.ambassadors for all to authenticated using (public.is_founder()) with check (public.is_founder());
grant select on public.ambassadors to anon;
grant select, insert, update, delete on public.ambassadors to authenticated;

-- First known source of a request: instagram, google, run-club, z:<ambassador>, …
alter table public.applications add column if not exists source text check (char_length(source) <= 60);
