-- Morning reminders for the free plans, and friends with a kilometre ranking.

-- ---------------------------------------------------------------- reminders
-- One reminder per runner per day.
create table if not exists public.app_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.app_reminders enable row level security;
revoke all on public.app_reminders from anon, authenticated;

-- Server only (app secret): plan data of runners who turned notifications on.
create or replace function public.app_plan_rows(p_secret text)
returns table (user_id uuid, key text, value jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select c.value from public.app_config c where c.key = 'purchase_secret') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select a.user_id, a.key, a.value from public.app_state a
     where a.key in ('vyra-goal-plan', 'vyra-start-on', 'vyra-start-plan')
       and exists (select 1 from public.push_subscriptions s where s.user_id = a.user_id);
end $$;

-- Server only: send today's reminder once. Returns false when it already went out.
create or replace function public.app_remind(p_secret text, p_user uuid, p_day date, p_title text, p_body text, p_link text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select c.value from public.app_config c where c.key = 'purchase_secret') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.app_reminders (user_id, day) values (p_user, p_day) on conflict do nothing;
  if not found then return false; end if;
  perform public.notify(p_user, 'reminder', left(p_title, 120), left(p_body, 300), p_link, null);
  return true;
end $$;

revoke execute on function public.app_plan_rows(text), public.app_remind(text, uuid, date, text, text, text) from public;
grant execute on function public.app_plan_rows(text), public.app_remind(text, uuid, date, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- friends
-- What a runner shows to friends: a name and weekly numbers. Written by the runner's own app.
create table if not exists public.app_runners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  name text not null default '' check (char_length(name) <= 60),
  week_start date,
  week_km numeric(7, 2) not null default 0,
  week_runs int not null default 0,
  month text,
  month_km numeric(8, 2) not null default 0,
  total_km numeric(9, 2) not null default 0,
  streak int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.app_runners enable row level security;
alter table public.app_friends enable row level security;
revoke all on public.app_runners, public.app_friends from anon, authenticated;

-- My card (creates it with a friend code on first use) and my numbers.
create or replace function public.runner_publish(p_name text, p_week_start date, p_week_km numeric, p_week_runs int, p_month text, p_month_km numeric, p_total_km numeric, p_streak int)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select code into v_code from public.app_runners where user_id = auth.uid();
  if v_code is null then
    loop
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 6));
      exit when not exists (select 1 from public.app_runners where code = v_code);
    end loop;
    insert into public.app_runners (user_id, code) values (auth.uid(), v_code);
  end if;
  update public.app_runners set
    name = left(coalesce(nullif(trim(p_name), ''), (select split_part(full_name, ' ', 1) from public.profiles where id = auth.uid()), 'Biegacz'), 60),
    week_start = p_week_start, week_km = greatest(0, least(coalesce(p_week_km, 0), 2000)), week_runs = greatest(0, least(coalesce(p_week_runs, 0), 100)),
    month = left(p_month, 7), month_km = greatest(0, least(coalesce(p_month_km, 0), 9000)),
    total_km = greatest(0, least(coalesce(p_total_km, 0), 999999)), streak = greatest(0, least(coalesce(p_streak, 0), 999)), updated_at = now()
  where user_id = auth.uid();
  return v_code;
end $$;

-- Add a friend by code: both see each other at once.
create or replace function public.friend_add(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v_friend uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select user_id, name into v_friend, v_name from public.app_runners where code = upper(trim(p_code));
  if v_friend is null then raise exception 'FRIEND_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_friend = auth.uid() then raise exception 'FRIEND_SELF' using errcode = 'P0001'; end if;
  if (select count(*) from public.app_friends where user_id = auth.uid()) >= 200 then raise exception 'FRIEND_LIMIT' using errcode = 'P0001'; end if;
  insert into public.app_friends (user_id, friend_id) values (auth.uid(), v_friend), (v_friend, auth.uid()) on conflict do nothing;
  return v_name;
end $$;

create or replace function public.friend_remove(p_friend uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.app_friends
   where (user_id = auth.uid() and friend_id = p_friend) or (user_id = p_friend and friend_id = auth.uid());
$$;

-- Me and my friends, with numbers only from the current week and month.
create or replace function public.friends_board(p_week_start date, p_month text)
returns table (user_id uuid, name text, me boolean, week_km numeric, week_runs int, month_km numeric, total_km numeric, streak int)
language sql stable security definer set search_path = public as $$
  select r.user_id, r.name, r.user_id = auth.uid(),
         case when r.week_start = p_week_start then r.week_km else 0 end,
         case when r.week_start = p_week_start then r.week_runs else 0 end,
         case when r.month = p_month then r.month_km else 0 end,
         r.total_km, r.streak
    from public.app_runners r
   where r.user_id = auth.uid()
      or r.user_id in (select f.friend_id from public.app_friends f where f.user_id = auth.uid());
$$;

revoke execute on function public.runner_publish(text, date, numeric, int, text, numeric, numeric, int), public.friend_add(text), public.friend_remove(uuid), public.friends_board(date, text) from public, anon;
grant execute on function public.runner_publish(text, date, numeric, int, text, numeric, numeric, int), public.friend_add(text), public.friend_remove(uuid), public.friends_board(date, text) to authenticated;
