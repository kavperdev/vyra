-- VYRA · public application form ("Dołącz do VYRA") on the brand home page
-- Anyone can submit an application; only coaches can read and manage them.

create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  full_name   text not null check (char_length(full_name) between 2 and 120),
  email       text not null check (char_length(email) between 5 and 254),
  phone       text check (phone is null or char_length(phone) <= 40),
  package     text check (package is null or package in ('plan', 'coaching', 'elite', 'unsure')),
  goal        text check (goal is null or char_length(goal) <= 1000),
  records     text check (records is null or char_length(records) <= 500),
  weekly_km   text check (weekly_km is null or char_length(weekly_km) <= 40),
  injuries    text check (injuries is null or char_length(injuries) <= 1000),
  message     text check (message is null or char_length(message) <= 2000),
  consent     boolean not null check (consent),
  status      text not null default 'new' check (status in ('new', 'contacted', 'invited', 'rejected')),
  updated_at  timestamptz not null default now()
);

create index applications_created_idx on public.applications (created_at desc);

alter table public.applications enable row level security;

-- Visitors (signed in or not) may only insert new applications. They cannot read anything back.
create policy applications_insert on public.applications
  for insert to anon, authenticated
  with check (status = 'new');

create policy applications_coach_select on public.applications
  for select to authenticated using (public.is_coach());

create policy applications_coach_update on public.applications
  for update to authenticated using (public.is_coach()) with check (public.is_coach());

create policy applications_coach_delete on public.applications
  for delete to authenticated using (public.is_coach());

revoke all on public.applications from public, anon, authenticated;
grant insert on public.applications to anon, authenticated;
grant select, delete on public.applications to authenticated;
grant update (status, updated_at) on public.applications to authenticated;
