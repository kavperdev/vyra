-- Founders give VYRA Method for free to any app account, forever or for a number of days.

alter table public.profiles add column if not exists method_until timestamptz;

create or replace function public.has_method_access(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select method_access and (method_until is null or method_until > now()) from public.profiles where id = p_user), false)
      or exists (
        select 1 from public.memberships m
        join public.profiles p on lower(p.email) = lower(m.email)
        where p.id = p_user and m.status = 'active' and m.plan_name ilike '%method%'
          and (m.access_until is null or m.access_until >= current_date))
$$;

-- p_days: null = no end date, 0 = take access away, n = n days from now.
create or replace function public.grant_method(p_user uuid, p_days int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.profiles
     set method_access = coalesce(p_days, 1) <> 0,
         method_until = case when p_days is null or p_days = 0 then null else now() + make_interval(days => p_days) end
   where id = p_user and role = 'athlete';
end $$;

-- Every runner account (free app accounts and coached athletes) for the founders' list.
create or replace function public.list_app_accounts(p_q text default null)
returns table (id uuid, full_name text, email text, created_at timestamptz, method_access boolean, method_until timestamptz, has_coach boolean, paid_method boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.email, p.created_at,
           p.method_access and (p.method_until is null or p.method_until > now()),
           p.method_until,
           exists (select 1 from public.coach_athletes c join public.profiles cp on cp.id = c.coach_id
                    where c.athlete_id = p.id and c.status = 'active' and coalesce(cp.staff_role, '') <> 'founder'),
           exists (select 1 from public.memberships m where lower(m.email) = lower(p.email) and m.status = 'active'
                    and m.plan_name ilike '%method%' and (m.access_until is null or m.access_until >= current_date))
      from public.profiles p
     where p.role = 'athlete'
       and (p_q is null or p_q = '' or p.full_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%')
     order by p.created_at desc
     limit 300;
end $$;

revoke execute on function public.grant_method(uuid, int), public.list_app_accounts(text) from public, anon;
grant execute on function public.grant_method(uuid, int), public.list_app_accounts(text) to authenticated;

-- The old on/off switch on the athlete page: switching on means no end date.
create or replace function public.set_method_access(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.profiles set method_access = coalesce(p_on, false), method_until = null where id = p_user;
end $$;
