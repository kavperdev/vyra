-- Panel założyciela: wgląd w konta i dane z aplikacji, edycja, usuwanie, własne powiadomienia.
-- Uruchom raz w Supabase → SQL Editor (po method_grants.sql). Każda funkcja sprawdza, czy wołający jest założycielem.

-- Lista kont z aktywnością w aplikacji.
create or replace function public.founder_accounts(p_q text default null)
returns table (id uuid, full_name text, email text, created_at timestamptz, last_sign_in timestamptz, last_active timestamptz,
               runs int, method_access boolean, method_until timestamptz, has_coach boolean, paid_method boolean, devices int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.email, p.created_at, u.last_sign_in_at,
           (select max(s.updated_at) from public.app_state s where s.user_id = p.id),
           coalesce((select case when jsonb_typeof(s.value) = 'array' then jsonb_array_length(s.value) else 0 end
                       from public.app_state s where s.user_id = p.id and s.key = 'vyra-log'), 0)::int,
           p.method_access and (p.method_until is null or p.method_until > now()),
           p.method_until,
           exists (select 1 from public.coach_athletes c join public.profiles cp on cp.id = c.coach_id
                    where c.athlete_id = p.id and c.status = 'active' and coalesce(cp.staff_role, '') <> 'founder'),
           exists (select 1 from public.memberships m where lower(m.email) = lower(p.email) and m.status = 'active'
                    and m.plan_name ilike '%method%' and (m.access_until is null or m.access_until >= current_date)),
           (select count(*) from public.push_subscriptions ps where ps.user_id = p.id)::int
      from public.profiles p
      left join auth.users u on u.id = p.id
     where p.role = 'athlete'
       and (p_q is null or p_q = '' or p.full_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%')
     order by coalesce((select max(s.updated_at) from public.app_state s where s.user_id = p.id), p.created_at) desc
     limit 500;
end $$;

-- Wszystko, co aplikacja trzyma na koncie jednej osoby (dziennik, plany, wyniki, ankieta).
create or replace function public.founder_account(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select jsonb_build_object(
    'id', p.id, 'full_name', p.full_name, 'email', p.email, 'created_at', p.created_at,
    'last_sign_in', u.last_sign_in_at,
    'method_access', p.method_access and (p.method_until is null or p.method_until > now()),
    'method_until', p.method_until,
    'devices', (select count(*) from public.push_subscriptions ps where ps.user_id = p.id),
    'state', coalesce((select jsonb_object_agg(s.key, jsonb_build_object('value', s.value, 'updated_at', s.updated_at))
                         from public.app_state s where s.user_id = p.id), '{}'::jsonb),
    'notifications', coalesce((select jsonb_agg(n order by n.created_at desc) from (
                         select title, body, created_at, read_at from public.notifications
                          where user_id = p.id order by created_at desc limit 10) n), '[]'::jsonb)
  ) into r
  from public.profiles p left join auth.users u on u.id = p.id
  where p.id = p_user;
  return r;
end $$;

-- Zmiana imienia i nazwiska.
create or replace function public.founder_update_account(p_user uuid, p_full_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.profiles set full_name = left(trim(p_full_name), 120) where id = p_user and role = 'athlete';
end $$;

-- Usunięcie konta biegacza (nie da się usunąć konta trenera ani założyciela).
create or replace function public.founder_delete_account(p_user uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_user and role = 'athlete') then
    raise exception 'NOT_ATHLETE';
  end if;
  delete from auth.users where id = p_user;
end $$;

-- Własne powiadomienie: do wybranych osób albo do grupy. Push wychodzi sam (jak każde powiadomienie).
-- p_segment: 'all' | 'free' | 'method' | 'inactive' (bez aktywności od 7 dni); ignorowany, gdy podano p_users.
create or replace function public.founder_notify(p_users uuid[], p_segment text, p_title text, p_body text, p_link text default '/app')
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'NO_TITLE'; end if;
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'announcement', left(trim(p_title), 80), nullif(left(trim(coalesce(p_body, '')), 300), ''),
         case when p_link ~ '^/[A-Za-z0-9/_?=&#%.-]*$' then p_link else '/app' end
    from public.profiles p
   where p.role = 'athlete'
     and (case
            when p_users is not null and cardinality(p_users) > 0 then p.id = any(p_users)
            when p_segment = 'method' then public.has_method_access(p.id)
            when p_segment = 'free' then not public.has_method_access(p.id)
            when p_segment = 'inactive' then coalesce((select max(s.updated_at) from public.app_state s where s.user_id = p.id), p.created_at) < now() - interval '7 days'
            else true
          end);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.founder_accounts(text), public.founder_account(uuid), public.founder_update_account(uuid, text),
  public.founder_delete_account(uuid), public.founder_notify(uuid[], text, text, text, text) from public, anon;
grant execute on function public.founder_accounts(text), public.founder_account(uuid), public.founder_update_account(uuid, text),
  public.founder_delete_account(uuid), public.founder_notify(uuid[], text, text, text, text) to authenticated;
