-- VYRA · VYRA Team: the representation (athletes shown on /team) and applications to join.
-- Safe to run more than once.

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  discipline  text not null default 'ulica' check (discipline in ('ulica', 'ultra', 'triathlon', 'hyrox', 'inne')),
  city        text check (char_length(city) <= 60),
  photo_url   text check (char_length(photo_url) <= 500),
  bio         text check (char_length(bio) <= 1200),
  pbs         text check (char_length(pbs) <= 400),
  goal        text check (char_length(goal) <= 160),
  quote       text check (char_length(quote) <= 240),
  instagram   text check (char_length(instagram) <= 60),
  tiktok      text check (char_length(tiktok) <= 60),
  strava_url  text check (char_length(strava_url) <= 300),
  sort        int not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.team_members enable row level security;
grant select on public.team_members to anon, authenticated;
grant insert, update, delete on public.team_members to authenticated;
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select to anon, authenticated using (visible or public.is_founder());
drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members for all to authenticated using (public.is_founder()) with check (public.is_founder());

create table if not exists public.team_applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  email       text not null check (char_length(email) between 5 and 254),
  discipline  text not null check (discipline in ('ulica', 'ultra', 'triathlon', 'hyrox', 'inne')),
  city        text check (char_length(city) <= 60),
  pbs         text not null check (char_length(pbs) between 3 and 400),
  about       text check (char_length(about) <= 1200),
  link        text check (char_length(link) <= 300),
  created_at  timestamptz not null default now()
);
alter table public.team_applications enable row level security;
revoke all on public.team_applications from anon, authenticated;
grant select, delete on public.team_applications to authenticated;
drop policy if exists team_applications_founder on public.team_applications;
create policy team_applications_founder on public.team_applications for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- Anyone may apply; at most 3 applications per e-mail.
create or replace function public.team_apply(p_name text, p_email text, p_discipline text, p_city text, p_pbs text, p_about text, p_link text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID_EMAIL' using errcode = '22023'; end if;
  if (select count(*) from team_applications where email = v_email) >= 3 then raise exception 'TOO_MANY' using errcode = '22023'; end if;
  insert into team_applications (name, email, discipline, city, pbs, about, link)
  values (left(trim(p_name), 80), v_email, p_discipline, nullif(left(trim(coalesce(p_city, '')), 60), ''), left(trim(p_pbs), 400),
          nullif(left(trim(coalesce(p_about, '')), 1200), ''), nullif(left(trim(coalesce(p_link, '')), 300), ''));
end $$;
revoke execute on function public.team_apply(text, text, text, text, text, text, text) from public;
grant execute on function public.team_apply(text, text, text, text, text, text, text) to anon, authenticated;
