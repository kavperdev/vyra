-- VYRA · camps module and brand-site content (Etap 3)
--
-- camps              editions shown on the brand site once published
-- camp_participants  people signed up for an edition (from the site form or added by hand)
-- camp_tests         diagnostics per participant: start and end of the camp
-- articles           "Wiedza" posts written in the panel
-- site_team          team cards shown on the brand site
--
-- Visitors read only published content. Staff read everything; founders manage camps,
-- participants and the team page; any staff member records tests and writes articles.

-- ---------------------------------------------------------------- camps
create table public.camps (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title        text not null check (char_length(title) between 2 and 160),
  format       text not null default 'weekend' check (format in ('weekend', 'week', 'other')),
  status       text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  starts_on    date,
  ends_on      date,
  location     text check (char_length(location) <= 160),
  venue        text check (char_length(venue) <= 160),
  price_pln    int check (price_pln between 0 and 1000000),
  capacity     int check (capacity between 1 and 500),
  summary      text check (char_length(summary) <= 600),
  description  text check (char_length(description) <= 20000),
  included     text check (char_length(included) <= 4000),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index camps_status_idx on public.camps (status, starts_on);
create trigger camps_updated before update on public.camps
  for each row execute function public.set_updated_at();

create table public.camp_participants (
  id              uuid primary key default gen_random_uuid(),
  camp_id         uuid not null references public.camps (id) on delete cascade,
  full_name       text not null check (char_length(full_name) between 2 and 120),
  email           text check (char_length(email) <= 254),
  phone           text check (char_length(phone) <= 40),
  status          text not null default 'interested'
                  check (status in ('interested', 'registered', 'paid', 'attended', 'cancelled')),
  athlete_id      uuid references public.profiles (id) on delete set null,
  application_id  uuid references public.applications (id) on delete set null,
  notes           text check (char_length(notes) <= 4000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index camp_participants_camp_idx on public.camp_participants (camp_id, status);
create unique index camp_participants_email_uq on public.camp_participants (camp_id, lower(email)) where email is not null;
create trigger camp_participants_updated before update on public.camp_participants
  for each row execute function public.set_updated_at();

create table public.camp_tests (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.camp_participants (id) on delete cascade,
  phase           text not null check (phase in ('start', 'end')),
  tested_on       date,
  vo2max          numeric(4,1) check (vo2max between 10 and 100),
  hr_max          int check (hr_max between 100 and 240),
  hr_rest         int check (hr_rest between 25 and 120),
  lt1_hr          int check (lt1_hr between 60 and 230),
  lt2_hr          int check (lt2_hr between 60 and 230),
  lt1_pace_s      int check (lt1_pace_s between 120 and 1200),
  lt2_pace_s      int check (lt2_pace_s between 120 and 1200),
  weight_kg       numeric(5,1) check (weight_kg between 20 and 300),
  body_fat_pct    numeric(4,1) check (body_fat_pct between 2 and 70),
  muscle_kg       numeric(5,1) check (muscle_kg between 5 and 150),
  cmj_cm          numeric(4,1) check (cmj_cm between 1 and 120),
  notes           text check (char_length(notes) <= 4000),
  recorded_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participant_id, phase)
);
create trigger camp_tests_updated before update on public.camp_tests
  for each row execute function public.set_updated_at();

-- Site sign-ups can name a camp; such an application also appears on that camp's participant list.
alter table public.applications add column camp_id uuid references public.camps (id) on delete set null;

create or replace function public.applications_to_participant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.camp_id is not null then
    insert into public.camp_participants (camp_id, full_name, email, phone, application_id)
    values (new.camp_id, new.full_name, lower(new.email), new.phone, new.id)
    on conflict do nothing;
  end if;
  return null;
end $$;
create trigger applications_to_participant after insert on public.applications
  for each row execute function public.applications_to_participant();

-- Only published (or closed) camps can take sign-ups from the site.
create or replace function public.applications_camp_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.camp_id is not null and not exists (
    select 1 from public.camps where id = new.camp_id and status = 'published') then
    new.camp_id := null;
  end if;
  return new;
end $$;
create trigger applications_camp_guard before insert on public.applications
  for each row execute function public.applications_camp_guard();

-- ---------------------------------------------------------------- articles
create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title         text not null check (char_length(title) between 2 and 200),
  excerpt       text check (char_length(excerpt) <= 400),
  body          text not null default '' check (char_length(body) <= 60000),
  category      text not null default 'trening' check (category in ('trening', 'sila', 'regeneracja', 'starty', 'zywienie', 'obozy')),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  author_id     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index articles_status_idx on public.articles (status, published_at desc);
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

create or replace function public.articles_publish_date() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'draft' then new.published_at := null; end if;
  return new;
end $$;
create trigger articles_publish_date before insert or update on public.articles
  for each row execute function public.articles_publish_date();

-- ---------------------------------------------------------------- team cards on the site
create table public.site_team (
  id          uuid primary key default gen_random_uuid(),
  full_name   text check (char_length(full_name) <= 120),
  role_label  text not null check (char_length(role_label) between 2 and 120),
  bio         text check (char_length(bio) <= 1200),
  areas       text check (char_length(areas) <= 300),
  sort        int not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger site_team_updated before update on public.site_team
  for each row execute function public.set_updated_at();

insert into public.site_team (full_name, role_label, bio, areas, sort) values
  ('Kacper Adamczyk', 'Trener biegowy · Współzałożyciel',
   'Odpowiada za planowanie treningu biegowego, periodyzację i analizę wyników zawodników w platformie VYRA.',
   'Periodyzacja, Strefy tempa i tętna, Przygotowanie startowe', 10),
  (null, 'Trener przygotowania siłowego · Współzałożyciel',
   'Odpowiada za trening siłowy i motoryczny, budowanie odporności na kontuzje i ekonomię ruchu.',
   'Siła i moc, Stabilizacja, Ekonomia ruchu', 20),
  (null, 'Fizjoterapeuta',
   'Odpowiada za diagnostykę, profilaktykę urazów i regenerację zawodników.',
   'Diagnostyka, Profilaktyka urazów, Regeneracja', 30);

-- ---------------------------------------------------------------- row level security
alter table public.camps              enable row level security;
alter table public.camp_participants  enable row level security;
alter table public.camp_tests         enable row level security;
alter table public.articles           enable row level security;
alter table public.site_team          enable row level security;

create policy camps_public_select on public.camps for select to anon, authenticated
  using (status in ('published', 'closed') or public.is_coach());
create policy camps_founder_write on public.camps for all to authenticated
  using (public.is_founder()) with check (public.is_founder());

-- Participants: staff read; founders manage; a participant linked to an athlete account sees their own row.
create policy camp_participants_select on public.camp_participants for select to authenticated
  using (public.is_coach() or athlete_id = auth.uid());
create policy camp_participants_founder_write on public.camp_participants for all to authenticated
  using (public.is_founder()) with check (public.is_founder());

create or replace function public.can_view_participant(p_participant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_coach() or exists (
    select 1 from public.camp_participants where id = p_participant and athlete_id = auth.uid())
$$;

-- Tests: any staff member records them; the participant reads their own.
create policy camp_tests_select on public.camp_tests for select to authenticated
  using (public.can_view_participant(participant_id));
create policy camp_tests_staff_write on public.camp_tests for all to authenticated
  using (public.is_coach()) with check (public.is_coach());

create policy articles_public_select on public.articles for select to anon, authenticated
  using (status = 'published' or public.is_coach());
create policy articles_staff_write on public.articles for all to authenticated
  using (public.is_coach()) with check (public.is_coach());

create policy site_team_public_select on public.site_team for select to anon, authenticated
  using (visible or public.is_founder());
create policy site_team_founder_write on public.site_team for all to authenticated
  using (public.is_founder()) with check (public.is_founder());

-- ---------------------------------------------------------------- grants
grant select on public.camps, public.articles, public.site_team to anon;
grant select, insert, update, delete on public.camps, public.camp_participants, public.camp_tests,
  public.articles, public.site_team to authenticated;
revoke execute on function public.can_view_participant(uuid) from public, anon;
grant execute on function public.can_view_participant(uuid) to authenticated;

-- Places taken per visible camp, for "wolne miejsca" on the site (counts only, no personal data).
create or replace function public.camp_taken_places()
returns table (camp_id uuid, taken int)
language sql stable security definer set search_path = public as $$
  select p.camp_id, count(*)::int
  from public.camp_participants p
  join public.camps c on c.id = p.camp_id
  where p.status in ('registered', 'paid', 'attended')
    and (c.status in ('published', 'closed') or public.is_coach())
  group by p.camp_id
$$;
revoke execute on function public.camp_taken_places() from public;
grant execute on function public.camp_taken_places() to anon, authenticated;
