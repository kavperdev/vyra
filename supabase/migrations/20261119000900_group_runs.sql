-- Wspólne biegi: runners post a run (city, public meeting place, time, distance, pace) and others join.
-- VYRA only shows the notices; it does not organise the runs. Using it needs the rules accepted (18+).

create table if not exists public.group_run_terms (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  adult boolean not null default false,
  accepted_at timestamptz not null default now()
);

create table if not exists public.group_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city text not null check (char_length(city) between 2 and 60),
  place text not null check (char_length(place) between 3 and 120),
  starts_at timestamptz not null,
  distance_km numeric(5, 1) check (distance_km is null or distance_km between 1 and 60),
  pace text check (pace is null or char_length(pace) <= 20),
  level text not null default 'easy' check (level in ('easy', 'steady', 'fast')),
  note text check (note is null or char_length(note) <= 300),
  max_people int not null default 8 check (max_people between 2 and 30),
  cancelled boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists group_runs_when on public.group_runs (starts_at) where not cancelled and not hidden;

create table if not exists public.group_run_people (
  run_id uuid not null references public.group_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (run_id, user_id)
);

create table if not exists public.group_run_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.group_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (run_id, user_id)
);

alter table public.group_run_terms enable row level security;
alter table public.group_runs enable row level security;
alter table public.group_run_people enable row level security;
alter table public.group_run_reports enable row level security;
revoke all on public.group_run_terms, public.group_runs, public.group_run_people, public.group_run_reports from anon, authenticated;

create or replace function public.group_run_terms_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_run_terms where user_id = auth.uid() and adult and version = '2026-11');
$$;

create or replace function public.group_run_accept(p_adult boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not coalesce(p_adult, false) then raise exception 'ADULT_ONLY' using errcode = 'P0001'; end if;
  insert into public.group_run_terms (user_id, version, adult) values (auth.uid(), '2026-11', true)
  on conflict (user_id) do update set version = '2026-11', adult = true, accepted_at = now();
end $$;

create or replace function public.group_run_create(p_city text, p_place text, p_starts_at timestamptz, p_distance numeric, p_pace text, p_level text, p_note text, p_max int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.group_run_terms_ok() then raise exception 'TERMS' using errcode = 'P0001'; end if;
  if p_starts_at < now() or p_starts_at > now() + interval '30 days' then raise exception 'BAD_TIME' using errcode = 'P0001'; end if;
  if (select count(*) from public.group_runs where user_id = auth.uid() and not cancelled and starts_at > now()) >= 5 then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;
  insert into public.group_runs (user_id, city, place, starts_at, distance_km, pace, level, note, max_people)
  values (auth.uid(), trim(p_city), trim(p_place), p_starts_at, p_distance, nullif(trim(p_pace), ''), coalesce(p_level, 'easy'), nullif(trim(p_note), ''), greatest(2, least(coalesce(p_max, 8), 30)))
  returning id into v_id;
  insert into public.group_run_people (run_id, user_id) values (v_id, auth.uid());
  return v_id;
end $$;

-- Upcoming runs (optionally in one city). Only first names are shown, never e-mail or surname.
create or replace function public.group_runs_list(p_city text default null)
returns table (id uuid, host text, mine boolean, city text, place text, starts_at timestamptz, distance_km numeric, pace text, level text, note text,
               max_people int, people int, joined boolean)
language sql stable security definer set search_path = public as $$
  select r.id, split_part(coalesce(nullif(trim(p.full_name), ''), 'Biegacz'), ' ', 1), r.user_id = auth.uid(), r.city, r.place, r.starts_at, r.distance_km, r.pace, r.level, r.note,
         r.max_people,
         (select count(*)::int from public.group_run_people x where x.run_id = r.id),
         exists (select 1 from public.group_run_people x where x.run_id = r.id and x.user_id = auth.uid())
    from public.group_runs r
    left join public.profiles p on p.id = r.user_id
   where auth.uid() is not null and not r.cancelled and not r.hidden
     and r.starts_at > now() - interval '1 hour'
     and (p_city is null or trim(p_city) = '' or r.city ilike trim(p_city))
   order by r.starts_at
   limit 60;
$$;

-- First names of the people going: only for the host and those who joined.
create or replace function public.group_run_people_names(p_run uuid) returns setof text
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(nullif(trim(p.full_name), ''), 'Biegacz'), ' ', 1)
    from public.group_run_people x left join public.profiles p on p.id = x.user_id
   where x.run_id = p_run
     and exists (select 1 from public.group_run_people me where me.run_id = p_run and me.user_id = auth.uid())
   order by x.created_at;
$$;

create or replace function public.group_run_join(p_run uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.group_runs;
begin
  if auth.uid() is null or not public.group_run_terms_ok() then raise exception 'TERMS' using errcode = 'P0001'; end if;
  select * into r from public.group_runs where id = p_run;
  if r.id is null or r.cancelled or r.hidden or r.starts_at < now() then raise exception 'GONE' using errcode = 'P0001'; end if;
  if (select count(*) from public.group_run_people where run_id = p_run) >= r.max_people then raise exception 'FULL' using errcode = 'P0001'; end if;
  insert into public.group_run_people (run_id, user_id) values (p_run, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.group_run_leave(p_run uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.group_run_people where run_id = p_run and user_id = auth.uid()
     and not exists (select 1 from public.group_runs r where r.id = p_run and r.user_id = auth.uid());
$$;

create or replace function public.group_run_cancel(p_run uuid) returns void
language sql security definer set search_path = public as $$
  update public.group_runs set cancelled = true where id = p_run and user_id = auth.uid();
$$;

-- A report hides the run at once after 3 different people report it; the founder sees all reports.
create or replace function public.group_run_report(p_run uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into public.group_run_reports (run_id, user_id, reason) values (p_run, auth.uid(), left(trim(p_reason), 500)) on conflict do nothing;
  if (select count(*) from public.group_run_reports where run_id = p_run) >= 3 then
    update public.group_runs set hidden = true where id = p_run;
  end if;
end $$;

revoke execute on function public.group_run_terms_ok(), public.group_run_accept(boolean),
  public.group_run_create(text, text, timestamptz, numeric, text, text, text, int), public.group_runs_list(text),
  public.group_run_people_names(uuid), public.group_run_join(uuid), public.group_run_leave(uuid), public.group_run_cancel(uuid),
  public.group_run_report(uuid, text) from public, anon;
grant execute on function public.group_run_terms_ok(), public.group_run_accept(boolean),
  public.group_run_create(text, text, timestamptz, numeric, text, text, text, int), public.group_runs_list(text),
  public.group_run_people_names(uuid), public.group_run_join(uuid), public.group_run_leave(uuid), public.group_run_cancel(uuid),
  public.group_run_report(uuid, text) to authenticated;
