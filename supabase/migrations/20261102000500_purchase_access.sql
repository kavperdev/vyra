-- VYRA · online purchase → instant platform access, starter week, automatic end of access.
-- Safe to run more than once.
--
-- 1. After a verified Stripe payment the website calls purchase_access(): it records a membership
--    and creates (or reuses) an invitation for the buyer's e-mail, so the buyer creates an account
--    right on the thank-you page. An existing athlete account is linked to the coach instead.
-- 2. After the starting questionnaire the athlete gets a first week of training (create_starter_week).
-- 3. Memberships end when a subscription is cancelled (Stripe webhook → purchase_end) or when a
--    one-off package runs out; sync_memberships() then archives the athlete, so lists stay clean.
-- purchase_access / purchase_end are protected by a secret only the server knows (VYRA_PURCHASE_SECRET).

insert into public.app_config (key, value)
values ('purchase_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create table if not exists public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  full_name           text,
  plan_name           text not null,
  kind                text not null check (kind in ('monthly', 'once')),
  stripe_session      text unique,
  stripe_subscription text,
  stripe_customer     text,
  status              text not null default 'active' check (status in ('active', 'ended')),
  access_until        date,
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists memberships_email_idx on public.memberships (lower(email));
create index if not exists memberships_sub_idx on public.memberships (stripe_subscription);

alter table public.memberships enable row level security;
drop policy if exists memberships_own on public.memberships;
drop policy if exists memberships_founders on public.memberships;
-- Athletes see their own memberships (matched by e-mail); founders see all. Writes only via functions.
create policy memberships_own on public.memberships for select to authenticated
  using (lower(email) = lower(coalesce((select p.email from public.profiles p where p.id = auth.uid()), '')) or public.is_founder());
grant select on public.memberships to authenticated;

create or replace function public.purchase_founder() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.profiles where role = 'coach' and staff_role = 'founder' order by created_at limit 1),
    (select id from public.profiles where role = 'coach' order by created_at limit 1))
$$;
revoke execute on function public.purchase_founder() from public, anon, authenticated;

drop function if exists public.purchase_access(text, text, text, text);
create or replace function public.purchase_access(
  p_secret text, p_email text, p_name text, p_plan text, p_kind text,
  p_session text, p_subscription text, p_customer text, p_days int)
returns table (token text, existing boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid := public.purchase_founder();
  v_prof  public.profiles;
  v_token text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_new   boolean := false;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'PURCHASE_EMAIL_INVALID' using errcode = '22023'; end if;
  if v_coach is null then raise exception 'NO_COACH' using errcode = 'P0001'; end if;

  insert into public.memberships (email, full_name, plan_name, kind, stripe_session, stripe_subscription, stripe_customer, access_until)
  values (v_email, nullif(left(trim(coalesce(p_name, '')), 120), ''), left(coalesce(p_plan, 'Pakiet'), 120),
          case when p_kind = 'monthly' then 'monthly' else 'once' end, p_session, nullif(p_subscription, ''), nullif(p_customer, ''),
          case when p_kind = 'monthly' or p_days is null then null else current_date + p_days end)
  on conflict (stripe_session) do nothing;
  v_new := found;

  select * into v_prof from public.profiles where lower(email) = v_email limit 1;
  if found then
    if v_prof.role = 'athlete' then
      insert into public.coach_athletes (coach_id, athlete_id) values (v_coach, v_prof.id)
        on conflict (coach_id, athlete_id) do update set status = 'active';
      insert into public.athlete_profiles (athlete_id) values (v_prof.id) on conflict do nothing;
    end if;
    if v_new then
      perform public.notify(v_coach, 'reminder', 'Zakup: ' || coalesce(v_prof.full_name, v_email), coalesce(p_plan, 'pakiet') || ' · konto już istnieje', '/coach/athletes/' || v_prof.id, null);
    end if;
    return query select null::text, true;
    return;
  end if;

  select i.token into v_token from public.invitations i
   where i.coach_id = v_coach and lower(i.email) = v_email and i.status = 'pending' limit 1;
  if v_token is null then
    insert into public.invitations (coach_id, email, full_name, message, expires_at)
    values (v_coach, v_email, nullif(left(trim(coalesce(p_name, '')), 120), ''), left('Zakup online: ' || coalesce(p_plan, 'pakiet'), 1000), now() + interval '30 days')
    returning invitations.token into v_token;
  else
    update public.invitations set expires_at = greatest(expires_at, now() + interval '30 days') where invitations.token = v_token;
  end if;
  if v_new then
    perform public.notify(v_coach, 'reminder', 'Nowy zakup: ' || coalesce(nullif(trim(p_name), ''), v_email), coalesce(p_plan, 'pakiet') || ' · klient zakłada konto', '/coach/applications', null);
  end if;
  return query select v_token, false;
end $$;
revoke execute on function public.purchase_access(text, text, text, text, text, text, text, text, int) from public;
grant execute on function public.purchase_access(text, text, text, text, text, text, text, text, int) to anon, authenticated;

-- Archives athletes whose every membership has ended (cancelled or run out). Athletes added by hand,
-- without any membership, are never touched. Returns how many were archived.
create or replace function public.sync_memberships() returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update public.memberships set status = 'ended', ended_at = now()
   where status = 'active' and access_until is not null and access_until < current_date;
  with gone as (
    select p.id from public.profiles p
     where p.role = 'athlete'
       and exists (select 1 from public.memberships m where lower(m.email) = lower(p.email))
       and not exists (select 1 from public.memberships m where lower(m.email) = lower(p.email) and m.status = 'active')
  )
  update public.coach_athletes ca set status = 'archived'
    from gone where ca.athlete_id = gone.id and ca.status = 'active';
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.sync_memberships() from public, anon;
grant execute on function public.sync_memberships() to authenticated;

-- Stripe webhook: a subscription was cancelled (end of the paid period).
create or replace function public.purchase_end(p_secret text, p_subscription text) returns int
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  update public.memberships set status = 'ended', ended_at = now()
   where stripe_subscription = p_subscription and status = 'active';
  return public.sync_memberships();
end $$;
revoke execute on function public.purchase_end(text, text) from public;
grant execute on function public.purchase_end(text, text) to anon, authenticated;

-- First week of training for a new buyer, created once, right after the starting questionnaire.
-- Only for an athlete with an active membership and no sessions yet. The website builds the week
-- from the questionnaire; this function checks it and writes it under the founder's name.
create or replace function public.create_starter_week(p_sessions jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_me    public.profiles;
  v_coach uuid;
  v_s     jsonb;
  v_seg   jsonb;
  v_ex    jsonb;
  v_set   jsonb;
  v_id    uuid;
  v_exid  uuid;
  v_n     int := 0;
  v_pos   int;
  v_spos  int;
  v_date  date;
begin
  select * into v_me from public.profiles where id = auth.uid();
  if not found or v_me.role <> 'athlete' then raise exception 'ONLY_ATHLETES' using errcode = '42501'; end if;
  if not exists (select 1 from public.memberships m where lower(m.email) = lower(v_me.email) and m.status = 'active') then
    return 0;
  end if;
  if exists (select 1 from public.training_sessions where athlete_id = v_me.id) then return 0; end if;
  select ca.coach_id into v_coach from public.coach_athletes ca
   where ca.athlete_id = v_me.id and ca.status = 'active' order by ca.created_at limit 1;
  if v_coach is null then return 0; end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) > 7 then
    raise exception 'STARTER_INVALID' using errcode = '22023';
  end if;

  perform set_config('vyra.bulk', 'on', true);
  for v_s in select * from jsonb_array_elements(p_sessions) loop
    v_date := (v_s ->> 'date')::date;
    if v_date < current_date or v_date > current_date + 10 then raise exception 'STARTER_DATE' using errcode = '22023'; end if;
    insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date, goal, instructions,
                                          planned_rpe, planned_duration_s, created_by, updated_by)
    values (v_coach, v_me.id, (v_s ->> 'kind')::public.session_kind, v_s ->> 'category', left(v_s ->> 'title', 160), v_date,
            left(v_s ->> 'goal', 500), left(v_s ->> 'instructions', 8000),
            nullif(v_s ->> 'rpe', '')::numeric, nullif(v_s ->> 'duration_s', '')::int, v_coach, v_coach)
    returning id into v_id;

    if v_s ->> 'kind' = 'running' then
      insert into public.running_workouts (session_id, structure, planned_duration_s, intensity_zone)
      values (v_id, coalesce(v_s ->> 'structure', 'continuous'), nullif(v_s ->> 'duration_s', '')::int, nullif(v_s ->> 'zone', ''));
      v_pos := 0;
      for v_seg in select * from jsonb_array_elements(coalesce(v_s -> 'segments', '[]'::jsonb)) loop
        v_pos := v_pos + 1;
        insert into public.running_segments (session_id, position, segment_type, label, repeats, duration_s, intensity,
                                             recovery_type, recovery_duration_s, notes)
        values (v_id, v_pos, v_seg ->> 'type', left(v_seg ->> 'label', 120), coalesce((v_seg ->> 'repeats')::int, 1),
                nullif(v_seg ->> 'duration_s', '')::int, nullif(v_seg ->> 'intensity', ''),
                nullif(v_seg ->> 'recovery_type', ''), nullif(v_seg ->> 'recovery_s', '')::int, left(v_seg ->> 'notes', 1000));
      end loop;
    else
      v_pos := 0;
      for v_ex in select * from jsonb_array_elements(coalesce(v_s -> 'exercises', '[]'::jsonb)) loop
        v_pos := v_pos + 1;
        insert into public.strength_exercises (session_id, position, name, description, rest_s)
        values (v_id, v_pos, left(v_ex ->> 'name', 120), left(v_ex ->> 'description', 2000), nullif(v_ex ->> 'rest_s', '')::int)
        returning id into v_exid;
        v_spos := 0;
        for v_set in select * from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]'::jsonb)) loop
          v_spos := v_spos + 1;
          insert into public.strength_sets (exercise_id, position, planned_reps, planned_duration_s, planned_rir)
          values (v_exid, v_spos, nullif(v_set ->> 'reps', '')::int, nullif(v_set ->> 'duration_s', '')::int, nullif(v_set ->> 'rir', '')::int);
        end loop;
      end loop;
    end if;
    v_n := v_n + 1;
  end loop;
  perform set_config('vyra.bulk', '', true);

  perform public.notify(v_coach, 'reminder', 'Tydzień startowy: ' || coalesce(v_me.full_name, v_me.email),
    v_n || ' treningi utworzone z ankiety. Sprawdź i dopasuj.', '/coach/athletes/' || v_me.id, null);
  return v_n;
end $$;
revoke execute on function public.create_starter_week(jsonb) from public, anon;
grant execute on function public.create_starter_week(jsonb) to authenticated;

-- Copy this value to Vercel → Settings → Environment Variables as VYRA_PURCHASE_SECRET, then Redeploy.
select value as "VYRA_PURCHASE_SECRET (skopiuj do Vercel)" from public.app_config where key = 'purchase_secret';
