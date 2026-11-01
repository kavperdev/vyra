-- VYRA · team roles (Etap 2)
--
-- Staff accounts keep role = 'coach' (they use the coach panel) and get a staff_role:
--   founder         full access: sees every athlete, invites staff, assigns athletes to staff
--   running_coach   plans and analyses training of assigned athletes
--   strength_coach  plans and analyses training of assigned athletes
--   physio          sees assigned athletes, writes team notes, does not plan training
-- Founders are linked to every athlete automatically, so every existing query and policy
-- that works through coach_athletes keeps working for them unchanged.

-- ---------------------------------------------------------------- staff role on profiles
alter table public.profiles add column staff_role text
  check (staff_role in ('founder', 'running_coach', 'strength_coach', 'physio'));

-- Existing coach accounts become founders (today there is one: the owner of VYRA).
update public.profiles set staff_role = 'founder' where role = 'coach' and staff_role is null;

alter table public.profiles add constraint profiles_staff_role_matches_role
  check ((role = 'coach') = (staff_role is not null));

-- Founders see every athlete: create the missing links once.
insert into public.coach_athletes (coach_id, athlete_id)
select f.id, a.id
from public.profiles f cross join public.profiles a
where f.staff_role = 'founder' and a.role = 'athlete'
on conflict do nothing;

-- ---------------------------------------------------------------- notification for new assignments
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('session_assigned', 'session_rescheduled', 'session_updated', 'comment',
                  'execution_logged', 'invite_accepted', 'reminder', 'assigned'));

-- ---------------------------------------------------------------- invitations can also invite staff
alter table public.invitations add column staff_role text
  check (staff_role in ('founder', 'running_coach', 'strength_coach', 'physio'));

-- ---------------------------------------------------------------- helpers
create or replace function public.my_staff_role() returns text
language sql stable security definer set search_path = public as $$
  select staff_role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_founder() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select staff_role = 'founder' from public.profiles where id = auth.uid()), false)
$$;

-- Staff who plan training. A physiotherapist reads and comments but does not plan.
create or replace function public.can_plan() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select staff_role in ('founder', 'running_coach', 'strength_coach')
                   from public.profiles where id = auth.uid()), false)
$$;

-- Active link AND a planning role: may plan for and edit data of the athlete.
create or replace function public.is_active_coach_of(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_plan() and exists (
    select 1 from public.coach_athletes ca
    join public.profiles p on p.id = ca.coach_id and p.role = 'coach'
    where ca.coach_id = auth.uid() and ca.athlete_id = p_athlete and ca.status = 'active')
$$;

-- ---------------------------------------------------------------- sign-up: staff invitations, founder links
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_token text := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_inv   public.invitations;
  v_role  text;
begin
  if v_token is not null then
    select * into v_inv from public.invitations where token = v_token for update;
    if not found or v_inv.status <> 'pending' or v_inv.expires_at < now() then
      raise exception 'INVITE_INVALID' using errcode = 'P0001';
    end if;
    if lower(v_inv.email) <> lower(coalesce(new.email, '')) then
      raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001';
    end if;

    if v_inv.staff_role is not null then
      -- Staff member joining the VYRA team.
      insert into public.profiles (id, role, staff_role, full_name, email)
        values (new.id, 'coach', v_inv.staff_role, coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email);
      if v_inv.staff_role = 'founder' then
        insert into public.coach_athletes (coach_id, athlete_id)
          select new.id, id from public.profiles where role = 'athlete' on conflict do nothing;
      end if;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu VYRA', null, '/coach/team', null);
    else
      -- Athlete joining a coach.
      insert into public.profiles (id, role, full_name, email)
        values (new.id, 'athlete', coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email);
      insert into public.athlete_profiles (athlete_id) values (new.id);
      insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, new.id) on conflict do nothing;
      insert into public.coach_athletes (coach_id, athlete_id)
        select id, new.id from public.profiles where staff_role = 'founder' on conflict do nothing;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu', null,
        '/coach/athletes/' || new.id, null);
    end if;
  else
    if coalesce((select value from public.app_config where key = 'coach_signup'), 'open') <> 'open' then
      raise exception 'COACH_SIGNUP_CLOSED' using errcode = 'P0001';
    end if;
    -- The very first account founds VYRA; later open sign-ups are independent coaches.
    v_role := case when exists (select 1 from public.profiles where staff_role = 'founder')
                   then 'running_coach' else 'founder' end;
    insert into public.profiles (id, role, staff_role, full_name, email)
      values (new.id, 'coach', v_role, coalesce(v_name, split_part(new.email, '@', 1)), new.email);
  end if;
  return new;
end $$;

-- Invitation landing page also needs to know whether it is a staff invitation.
drop function if exists public.get_invitation(text);
create function public.get_invitation(p_token text)
returns table (email text, full_name text, coach_name text, status public.invite_status, expired boolean, staff_role text)
language sql stable security definer set search_path = public as $$
  select i.email, i.full_name, p.full_name, i.status, i.expires_at < now(), i.staff_role
  from public.invitations i join public.profiles p on p.id = i.coach_id
  where i.token = p_token
$$;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- Existing accounts can accept athlete invitations only (staff join with a new account).
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv  public.invitations;
  v_me   public.profiles;
begin
  select * into v_me from public.profiles where id = auth.uid();
  if not found then raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001'; end if;
  if v_me.role <> 'athlete' then raise exception 'ONLY_ATHLETES_CAN_ACCEPT' using errcode = 'P0001'; end if;
  select * into v_inv from public.invitations where token = p_token for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at < now() then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  end if;
  if v_inv.staff_role is not null then raise exception 'INVITE_INVALID' using errcode = 'P0001'; end if;
  if lower(v_inv.email) <> lower(coalesce(v_me.email, '')) then
    raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;
  insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, v_me.id)
    on conflict (coach_id, athlete_id) do update set status = 'active';
  insert into public.coach_athletes (coach_id, athlete_id)
    select id, v_me.id from public.profiles where staff_role = 'founder' on conflict do nothing;
  insert into public.athlete_profiles (athlete_id) values (v_me.id) on conflict do nothing;
  update public.invitations set status = 'accepted', accepted_by = v_me.id, accepted_at = now() where id = v_inv.id;
  perform public.notify(v_inv.coach_id, 'invite_accepted', v_me.full_name || ' dołączył(a) do zespołu', null,
    '/coach/athletes/' || v_me.id, null);
  return v_inv.coach_id;
end $$;

-- ---------------------------------------------------------------- founder tools
-- Assign or unassign an athlete to a staff member (running/strength coach, physio).
create or replace function public.set_staff_assignment(p_staff uuid, p_athlete uuid, p_assigned boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_staff public.profiles;
  v_athlete_name text;
begin
  if not public.is_founder() then raise exception 'ONLY_FOUNDERS' using errcode = '42501'; end if;
  select * into v_staff from public.profiles where id = p_staff;
  if not found or v_staff.role <> 'coach' then raise exception 'NOT_STAFF' using errcode = 'P0001'; end if;
  if v_staff.staff_role = 'founder' then raise exception 'FOUNDERS_SEE_ALL' using errcode = 'P0001'; end if;
  select full_name into v_athlete_name from public.profiles where id = p_athlete and role = 'athlete';
  if not found then raise exception 'NOT_ATHLETE' using errcode = 'P0001'; end if;

  if p_assigned then
    insert into public.coach_athletes (coach_id, athlete_id) values (p_staff, p_athlete)
      on conflict (coach_id, athlete_id) do update set status = 'active';
    perform public.notify(p_staff, 'assigned', 'Nowy zawodnik: ' || v_athlete_name, null,
      '/coach/athletes/' || p_athlete, null);
  else
    delete from public.coach_athletes where coach_id = p_staff and athlete_id = p_athlete;
  end if;
end $$;
revoke execute on function public.set_staff_assignment(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_staff_assignment(uuid, uuid, boolean) to authenticated;

-- Change a staff member's role. A founder cannot remove the last founder.
create or replace function public.set_staff_role(p_staff uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  if not public.is_founder() then raise exception 'ONLY_FOUNDERS' using errcode = '42501'; end if;
  if p_role not in ('founder', 'running_coach', 'strength_coach', 'physio') then
    raise exception 'INVALID_ROLE' using errcode = 'P0001';
  end if;
  select staff_role into v_old from public.profiles where id = p_staff and role = 'coach';
  if not found then raise exception 'NOT_STAFF' using errcode = 'P0001'; end if;
  if v_old = 'founder' and p_role <> 'founder'
     and (select count(*) from public.profiles where staff_role = 'founder') <= 1 then
    raise exception 'LAST_FOUNDER' using errcode = 'P0001';
  end if;
  update public.profiles set staff_role = p_role where id = p_staff;
  if p_role = 'founder' then
    insert into public.coach_athletes (coach_id, athlete_id)
      select p_staff, id from public.profiles where role = 'athlete' on conflict do nothing;
  end if;
end $$;
revoke execute on function public.set_staff_role(uuid, text) from public, anon;
grant execute on function public.set_staff_role(uuid, text) to authenticated;

revoke execute on function public.my_staff_role() from public, anon;
grant execute on function public.my_staff_role() to authenticated;

-- ---------------------------------------------------------------- policies
-- Staff see each other (team page, note authors). Athletes still see only their own coaches.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_coach_of(id)
  or (public.is_coach() and role = 'coach')
  or exists (select 1 from public.coach_athletes ca where ca.athlete_id = auth.uid() and ca.coach_id = profiles.id));

-- Links: your own, plus the team of athletes you work with; founders see all.
drop policy coach_athletes_select on public.coach_athletes;
create policy coach_athletes_select on public.coach_athletes for select to authenticated
  using (coach_id = auth.uid() or athlete_id = auth.uid() or public.is_coach_of(athlete_id) or public.is_founder());

-- Notes are shared by the whole team working with the athlete; each author edits only their own.
drop policy coach_notes_all on public.coach_notes;
create policy coach_notes_select on public.coach_notes for select to authenticated
  using (public.is_coach_of(athlete_id));
create policy coach_notes_insert on public.coach_notes for insert to authenticated
  with check (coach_id = auth.uid() and public.is_coach_of(athlete_id));
create policy coach_notes_update on public.coach_notes for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.is_coach_of(athlete_id));
create policy coach_notes_delete on public.coach_notes for delete to authenticated
  using (coach_id = auth.uid());

-- Any planning staff member of the athlete may edit a session, not only its author.
drop policy training_sessions_update on public.training_sessions;
create policy training_sessions_update on public.training_sessions for update to authenticated
  using (public.is_active_coach_of(athlete_id))
  with check (public.is_active_coach_of(athlete_id));

-- Staff invitations can only be created by founders.
drop policy invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated
  with check (coach_id = auth.uid() and public.is_coach() and status = 'pending'
              and (staff_role is null or public.is_founder()));

-- Applications from the brand site are handled by founders only.
drop policy applications_coach_select on public.applications;
drop policy applications_coach_update on public.applications;
drop policy applications_coach_delete on public.applications;
create policy applications_founder_select on public.applications
  for select to authenticated using (public.is_founder());
create policy applications_founder_update on public.applications
  for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy applications_founder_delete on public.applications
  for delete to authenticated using (public.is_founder());
