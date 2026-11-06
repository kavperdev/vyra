-- VYRA · Challenges open to every runner, whatever club they run with.
-- Members get a VYRA number; each challenge has a person ranking and a club ranking.
-- Nobody needs an account: a private link (token) in the e-mail is used to log runs.
-- Safe to run more than once.

-- 1. VYRA members: one number per e-mail, given on the first challenge.
create table if not exists public.vyra_members (
  member_no  int generated always as identity primary key,
  email      text not null unique check (char_length(email) between 5 and 254),
  name       text not null check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now()
);
alter table public.vyra_members enable row level security;
revoke all on public.vyra_members from anon, authenticated;
grant select on public.vyra_members to authenticated;
drop policy if exists vyra_members_founder on public.vyra_members;
create policy vyra_members_founder on public.vyra_members for select to authenticated using (public.is_founder());

-- 2. Challenges, set up by founders in the panel.
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title       text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  kind        text not null default 'km' check (kind in ('km', 'runs')),
  goal        numeric(7,1) check (goal > 0),
  starts_on   date not null,
  ends_on     date not null,
  visible     boolean not null default false,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table public.challenges enable row level security;
grant select on public.challenges to anon, authenticated;
grant insert, update, delete on public.challenges to authenticated;
drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select to anon, authenticated using (visible or public.is_founder());
drop policy if exists challenges_write on public.challenges;
create policy challenges_write on public.challenges for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- 3. Participants and their runs. Only reachable through the functions below (and by founders).
create table if not exists public.challenge_participants (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  member_no    int not null references public.vyra_members (member_no) on delete cascade,
  club         text check (char_length(club) <= 60),
  token        uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  unique (challenge_id, member_no)
);
create table if not exists public.challenge_entries (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.challenge_participants (id) on delete cascade,
  day            date not null,
  km             numeric(5,2) not null check (km between 0.5 and 100),
  created_at     timestamptz not null default now()
);
create index if not exists challenge_entries_participant on public.challenge_entries (participant_id);
alter table public.challenge_participants enable row level security;
alter table public.challenge_entries enable row level security;
revoke all on public.challenge_participants, public.challenge_entries from anon, authenticated;
grant select, delete on public.challenge_participants, public.challenge_entries to authenticated;
drop policy if exists challenge_participants_founder on public.challenge_participants;
create policy challenge_participants_founder on public.challenge_participants for all to authenticated using (public.is_founder()) with check (public.is_founder());
drop policy if exists challenge_entries_founder on public.challenge_entries;
create policy challenge_entries_founder on public.challenge_entries for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- Join: returns the private token and VYRA number only for a NEW participant.
-- Someone already in returns token = null; the server then e-mails their link again.
create or replace function public.challenge_join(p_challenge uuid, p_email text, p_name text, p_club text)
returns table (token uuid, member_no int, is_new boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
  v_no int;
  v_token uuid;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if not exists (select 1 from challenges c where c.id = p_challenge and c.visible and c.ends_on >= (now() at time zone 'Europe/Warsaw')::date) then
    raise exception 'CHALLENGE_CLOSED' using errcode = '22023';
  end if;
  insert into vyra_members (email, name) values (v_email, left(trim(p_name), 60))
    on conflict (email) do nothing;
  select m.member_no into v_no from vyra_members m where m.email = v_email;
  insert into challenge_participants (challenge_id, member_no, club)
    values (p_challenge, v_no, nullif(left(trim(coalesce(p_club, '')), 60), ''))
    on conflict (challenge_id, member_no) do nothing
    returning challenge_participants.token into v_token;
  return query select v_token, v_no, v_token is not null;
end $$;
revoke execute on function public.challenge_join(uuid, text, text, text) from public;
grant execute on function public.challenge_join(uuid, text, text, text) to anon, authenticated;

-- Server only: a participant's token, to e-mail their link again.
create or replace function public.challenge_token(p_secret text, p_challenge uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  return (select p.token from challenge_participants p join vyra_members m on m.member_no = p.member_no
           where p.challenge_id = p_challenge and m.email = lower(trim(p_email)));
end $$;
revoke execute on function public.challenge_token(text, uuid, text) from public;
grant execute on function public.challenge_token(text, uuid, text) to anon, authenticated;

-- The participant's own page: who they are, the challenge, their runs.
create or replace function public.challenge_me(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', m.name, 'member_no', m.member_no, 'club', p.club,
    'challenge', jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'kind', c.kind, 'goal', c.goal, 'starts_on', c.starts_on, 'ends_on', c.ends_on),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'day', e.day, 'km', e.km) order by e.day desc, e.created_at desc)
                          from challenge_entries e where e.participant_id = p.id), '[]'::jsonb))
  from challenge_participants p
  join vyra_members m on m.member_no = p.member_no
  join challenges c on c.id = p.challenge_id
  where p.token = p_token;
$$;
revoke execute on function public.challenge_me(uuid) from public;
grant execute on function public.challenge_me(uuid) to anon, authenticated;

-- Log one run. Only days inside the challenge, not in the future, at most 150 km a day.
create or replace function public.challenge_log(p_token uuid, p_day date, p_km numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p uuid;
  v_start date;
  v_end date;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  select p.id, c.starts_on, c.ends_on into v_p, v_start, v_end
    from challenge_participants p join challenges c on c.id = p.challenge_id where p.token = p_token;
  if v_p is null then raise exception 'NOT_FOUND' using errcode = '22023'; end if;
  if p_day < v_start or p_day > v_end or p_day > v_today then raise exception 'DAY_OUTSIDE' using errcode = '22023'; end if;
  if p_km is null or p_km < 0.5 or p_km > 100 then raise exception 'KM_RANGE' using errcode = '22023'; end if;
  if coalesce((select sum(km) from challenge_entries where participant_id = v_p and day = p_day), 0) + p_km > 150 then
    raise exception 'KM_RANGE' using errcode = '22023';
  end if;
  insert into challenge_entries (participant_id, day, km) values (v_p, p_day, round(p_km, 2));
end $$;
revoke execute on function public.challenge_log(uuid, date, numeric) from public;
grant execute on function public.challenge_log(uuid, date, numeric) to anon, authenticated;

create or replace function public.challenge_unlog(p_token uuid, p_entry uuid)
returns void
language sql security definer set search_path = public as $$
  delete from challenge_entries e using challenge_participants p
   where e.id = p_entry and e.participant_id = p.id and p.token = p_token;
$$;
revoke execute on function public.challenge_unlog(uuid, uuid) from public;
grant execute on function public.challenge_unlog(uuid, uuid) to anon, authenticated;

-- Public ranking of people: first name, club, VYRA number, km and runs. No e-mails.
create or replace function public.challenge_board(p_challenge uuid)
returns table (member_no int, name text, club text, km numeric, runs int)
language sql stable security definer set search_path = public as $$
  select m.member_no, m.name, p.club, coalesce(sum(e.km), 0), count(e.id)::int
    from challenge_participants p
    join vyra_members m on m.member_no = p.member_no
    join challenges c on c.id = p.challenge_id and c.visible
    left join challenge_entries e on e.participant_id = p.id
   where p.challenge_id = p_challenge
   group by m.member_no, m.name, p.club
   order by 4 desc, 5 desc, 1;
$$;
revoke execute on function public.challenge_board(uuid) from public;
grant execute on function public.challenge_board(uuid) to anon, authenticated;

-- Public ranking of clubs (same name in any letter case counts as one club).
create or replace function public.challenge_clubs(p_challenge uuid)
returns table (club text, people int, km numeric, runs int)
language sql stable security definer set search_path = public as $$
  select min(p.club), count(distinct p.id)::int, coalesce(sum(e.km), 0), count(e.id)::int
    from challenge_participants p
    join challenges c on c.id = p.challenge_id and c.visible
    left join challenge_entries e on e.participant_id = p.id
   where p.challenge_id = p_challenge and p.club is not null
   group by lower(p.club)
   order by 3 desc, 2 desc;
$$;
revoke execute on function public.challenge_clubs(uuid) from public;
grant execute on function public.challenge_clubs(uuid) to anon, authenticated;
