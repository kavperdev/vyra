-- Free "Zacznij biegać" plan: access and progress stored on the server, so they survive
-- a closed browser, Safari's storage clean-up, the Instagram in-app browser and a new phone.
-- A person is identified by a random token (in their personal link, a cookie and the browser).

create table if not exists public.free_plan_progress (
  token uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  full_name text not null default '' check (char_length(full_name) <= 120),
  done jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.free_plan_progress enable row level security;
-- No policies: the table is reached only through the functions below.
revoke all on public.free_plan_progress from anon, authenticated;

-- Server only (needs the app secret): registers an e-mail. Returns the token and whether it is new.
-- An existing e-mail never gets its token back here; the server e-mails the personal link instead.
create or replace function public.free_plan_start(p_secret text, p_email text, p_name text)
returns table (token uuid, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_token uuid;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.free_plan_progress (email, full_name)
  values (lower(trim(p_email)), left(coalesce(trim(p_name), ''), 120))
  on conflict (email) do nothing
  returning free_plan_progress.token into v_token;
  if v_token is not null then
    return query select v_token, true;
  else
    return query select f.token, false from public.free_plan_progress f where f.email = lower(trim(p_email));
  end if;
end $$;
revoke execute on function public.free_plan_start(text, text, text) from public;
grant execute on function public.free_plan_start(text, text, text) to anon, authenticated;

-- Anyone holding the token: read the plan's name and progress.
create or replace function public.free_plan_get(p_token uuid)
returns table (full_name text, done jsonb)
language sql security definer stable set search_path = public as $$
  select f.full_name, f.done from public.free_plan_progress f where f.token = p_token;
$$;
revoke execute on function public.free_plan_get(uuid) from public;
grant execute on function public.free_plan_get(uuid) to anon, authenticated;

-- Anyone holding the token: save progress. Only "week-session": true pairs from the plan are kept.
create or replace function public.free_plan_save(p_token uuid, p_done jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_clean jsonb;
begin
  if p_done is null or jsonb_typeof(p_done) <> 'object' or length(p_done::text) > 2000 then
    return false;
  end if;
  select coalesce(jsonb_object_agg(k, true), '{}'::jsonb) into v_clean
    from jsonb_each(p_done) as e(k, v)
   where k ~ '^[1-9][0-9]?-[0-9]$' and v = 'true'::jsonb;
  update public.free_plan_progress set done = v_clean, updated_at = now() where token = p_token;
  return found;
end $$;
revoke execute on function public.free_plan_save(uuid, jsonb) from public;
grant execute on function public.free_plan_save(uuid, jsonb) to anon, authenticated;
