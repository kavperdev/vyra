-- VYRA · Run Club (group runs with sign-up), business inquiries, testimonials on the website

-- ---------------------------------------------------------------- Run Club
create table if not exists public.run_club_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 120),
  starts_at   timestamptz not null,
  place       text not null check (char_length(place) between 2 and 160),
  map_url     text check (char_length(map_url) <= 500),
  pace        text check (char_length(pace) <= 80),
  description text check (char_length(description) <= 2000),
  capacity    int check (capacity between 1 and 500),
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);
create table if not exists public.run_club_signups (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.run_club_events (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 120),
  email       text not null check (char_length(email) between 5 and 254),
  created_at  timestamptz not null default now(),
  unique (event_id, email)
);
alter table public.run_club_events enable row level security;
alter table public.run_club_signups enable row level security;
drop policy if exists run_club_events_public on public.run_club_events;
drop policy if exists run_club_events_staff on public.run_club_events;
drop policy if exists run_club_signups_insert on public.run_club_signups;
drop policy if exists run_club_signups_staff on public.run_club_signups;
create policy run_club_events_public on public.run_club_events for select to anon, authenticated using (visible or public.is_coach());
create policy run_club_events_staff on public.run_club_events for all to authenticated using (public.is_founder()) with check (public.is_founder());
-- Visitors may sign up for a visible, upcoming event; they can never read the list back.
create policy run_club_signups_insert on public.run_club_signups for insert to anon, authenticated
  with check (exists (select 1 from public.run_club_events e where e.id = event_id and e.visible and e.starts_at > now()));
create policy run_club_signups_staff on public.run_club_signups for all to authenticated using (public.is_coach()) with check (public.is_coach());
grant select on public.run_club_events to anon;
grant insert on public.run_club_signups to anon;
grant select, insert, update, delete on public.run_club_events, public.run_club_signups to authenticated;

-- Number of sign-ups per upcoming event, without exposing who signed up.
create or replace function public.run_club_counts() returns table (event_id uuid, taken int)
language sql stable security definer set search_path = public as $$
  select s.event_id, count(*)::int from public.run_club_signups s
    join public.run_club_events e on e.id = s.event_id and e.visible
   group by s.event_id
$$;
grant execute on function public.run_club_counts() to anon, authenticated;

-- ---------------------------------------------------------------- business inquiries
alter table public.applications drop constraint if exists applications_kind_check;
alter table public.applications add constraint applications_kind_check check (kind in ('coaching', 'camp', 'business'));

-- ---------------------------------------------------------------- testimonials
create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  result      text check (char_length(result) <= 120),
  quote       text not null check (char_length(quote) between 5 and 600),
  quote_en    text check (char_length(quote_en) <= 600),
  sort        int not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.testimonials enable row level security;
drop policy if exists testimonials_public on public.testimonials;
drop policy if exists testimonials_founders on public.testimonials;
create policy testimonials_public on public.testimonials for select to anon, authenticated using (visible or public.is_founder());
create policy testimonials_founders on public.testimonials for all to authenticated using (public.is_founder()) with check (public.is_founder());
grant select on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;
