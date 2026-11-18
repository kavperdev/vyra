-- Ekipa: friends see the trainings you choose to share, react (🔥 / 🙌) and comment.
-- Only what the runner shares: sport, distance, time, title. Never readiness, pain, notes or health data.

create table if not exists public.app_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id text not null,
  day date not null,
  sport text not null default 'run',
  km numeric(7, 2) not null default 0,
  sec int not null default 0,
  title text,
  visibility text not null default 'friends' check (visibility in ('friends', 'me')),
  created_at timestamptz not null default now(),
  unique (user_id, run_id)
);
create index if not exists app_moments_user_day on public.app_moments (user_id, day desc);

create table if not exists public.app_moment_reactions (
  moment_id uuid not null references public.app_moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('fire', 'five')),
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id, kind)
);

create table if not exists public.app_moment_comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.app_moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists app_moment_comments_m on public.app_moment_comments (moment_id, created_at);

alter table public.app_moments enable row level security;
alter table public.app_moment_reactions enable row level security;
alter table public.app_moment_comments enable row level security;
revoke all on public.app_moments, public.app_moment_reactions, public.app_moment_comments from anon, authenticated;

-- Can I see this moment? Mine, or a friend's shared with friends.
create or replace function public.moment_visible(p_moment uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_moments m
     where m.id = p_moment
       and (m.user_id = auth.uid()
            or (m.visibility = 'friends' and m.user_id in (select f.friend_id from public.app_friends f where f.user_id = auth.uid())))
  );
$$;

-- Share (or update) one training from my diary.
create or replace function public.moment_share(p_run_id text, p_day date, p_sport text, p_km numeric, p_sec int, p_title text, p_visibility text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into public.app_moments (user_id, run_id, day, sport, km, sec, title, visibility)
  values (auth.uid(), left(p_run_id, 80), p_day, left(coalesce(p_sport, 'run'), 20),
          greatest(0, least(coalesce(p_km, 0), 500)), greatest(0, least(coalesce(p_sec, 0), 86400)),
          left(nullif(trim(p_title), ''), 80), case when p_visibility = 'me' then 'me' else 'friends' end)
  on conflict (user_id, run_id) do update set
    day = excluded.day, sport = excluded.sport, km = excluded.km, sec = excluded.sec, title = excluded.title, visibility = excluded.visibility
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.moment_unshare(p_run_id text) returns void
language sql security definer set search_path = public as $$
  delete from public.app_moments where user_id = auth.uid() and run_id = p_run_id;
$$;

-- The feed: mine and my friends' shared trainings, newest first, with reactions and comment counts.
create or replace function public.moments_feed(p_limit int default 40, p_before date default null)
returns table (id uuid, user_id uuid, name text, me boolean, streak int, run_id text, day date, sport text, km numeric, sec int, title text, visibility text,
               fire int, five int, my_fire boolean, my_five boolean, comments int)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, coalesce(r.name, 'Biegacz'), m.user_id = auth.uid(), coalesce(r.streak, 0), m.run_id, m.day, m.sport, m.km, m.sec, m.title, m.visibility,
         (select count(*)::int from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'fire'),
         (select count(*)::int from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'five'),
         exists (select 1 from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'fire' and x.user_id = auth.uid()),
         exists (select 1 from public.app_moment_reactions x where x.moment_id = m.id and x.kind = 'five' and x.user_id = auth.uid()),
         (select count(*)::int from public.app_moment_comments c where c.moment_id = m.id)
    from public.app_moments m
    left join public.app_runners r on r.user_id = m.user_id
   where (m.user_id = auth.uid()
          or (m.visibility = 'friends' and m.user_id in (select f.friend_id from public.app_friends f where f.user_id = auth.uid())))
     and (p_before is null or m.day < p_before)
     and m.day >= current_date - 60
   order by m.day desc, m.created_at desc
   limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

-- 🔥 or 🙌: tap to give, tap again to take back. Returns true when given.
create or replace function public.moment_react(p_moment uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.moment_visible(p_moment) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_kind not in ('fire', 'five') then raise exception 'BAD_KIND' using errcode = 'P0001'; end if;
  delete from public.app_moment_reactions where moment_id = p_moment and user_id = auth.uid() and kind = p_kind;
  if found then return false; end if;
  insert into public.app_moment_reactions (moment_id, user_id, kind) values (p_moment, auth.uid(), p_kind);
  return true;
end $$;

create or replace function public.moment_comment(p_moment uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.moment_visible(p_moment) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if (select count(*) from public.app_moment_comments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;
  insert into public.app_moment_comments (moment_id, user_id, body) values (p_moment, auth.uid(), left(trim(p_body), 300)) returning id into v_id;
  return v_id;
end $$;

-- Delete my comment, or any comment under my own training.
create or replace function public.moment_uncomment(p_comment uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.app_moment_comments c
   where c.id = p_comment
     and (c.user_id = auth.uid() or exists (select 1 from public.app_moments m where m.id = c.moment_id and m.user_id = auth.uid()));
$$;

create or replace function public.moment_comments(p_moment uuid)
returns table (id uuid, user_id uuid, name text, me boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, coalesce(r.name, 'Biegacz'), c.user_id = auth.uid(), c.body, c.created_at
    from public.app_moment_comments c
    left join public.app_runners r on r.user_id = c.user_id
   where c.moment_id = p_moment and public.moment_visible(p_moment)
   order by c.created_at
   limit 100;
$$;

revoke execute on function public.moment_visible(uuid), public.moment_share(text, date, text, numeric, int, text, text), public.moment_unshare(text),
  public.moments_feed(int, date), public.moment_react(uuid, text), public.moment_comment(uuid, text), public.moment_uncomment(uuid), public.moment_comments(uuid) from public, anon;
grant execute on function public.moment_visible(uuid), public.moment_share(text, date, text, numeric, int, text, text), public.moment_unshare(text),
  public.moments_feed(int, date), public.moment_react(uuid, text), public.moment_comment(uuid, text), public.moment_uncomment(uuid), public.moment_comments(uuid) to authenticated;
