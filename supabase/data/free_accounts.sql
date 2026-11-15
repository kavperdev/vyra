-- Free VYRA app accounts: anyone can sign up in the app to keep the free plan and log on every phone.
-- Sign-up metadata signup='free' creates an athlete without a coach and without paid access
-- (the athlete platform stays locked until a package or VYRA Method is bought).

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_token text := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_inv   public.invitations;
  v_role  text;
  v_club  uuid;
begin
  -- Athletes without an account are created by create_managed_athlete(), which sets this flag itself.
  if coalesce(current_setting('vyra.managed_user', true), '') = new.id::text then
    return new;
  end if;
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
      insert into public.profiles (id, role, staff_role, full_name, email, club_id)
        values (new.id, 'coach', v_inv.staff_role, coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email, v_inv.club_id);
      if v_inv.staff_role = 'founder' then
        insert into public.coach_athletes (coach_id, athlete_id)
          select new.id, id from public.profiles where role = 'athlete' on conflict do nothing;
      end if;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu VYRA', null, '/coach/team', null);
    else
      -- Athlete joining a coach.
      v_club := coalesce(v_inv.club_id, (select club_id from public.profiles where id = v_inv.coach_id));
      insert into public.profiles (id, role, full_name, email, club_id)
        values (new.id, 'athlete', coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email, v_club);
      insert into public.athlete_profiles (athlete_id) values (new.id);
      insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, new.id) on conflict do nothing;
      insert into public.coach_athletes (coach_id, athlete_id)
        select id, new.id from public.profiles where staff_role = 'founder' on conflict do nothing;
      update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
      perform public.notify(v_inv.coach_id, 'invite_accepted',
        coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu', null,
        '/coach/athletes/' || new.id, null);
    end if;
  elsif coalesce(new.raw_user_meta_data ->> 'signup', '') = 'free' then
    -- Free app account (free plan, log, tools): an athlete with no coach and no paid access.
    insert into public.profiles (id, role, full_name, email)
      values (new.id, 'athlete', coalesce(v_name, split_part(new.email, '@', 1)), new.email);
    insert into public.athlete_profiles (athlete_id) values (new.id) on conflict do nothing;
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

-- Lets the app check that this migration is in place before offering free sign-up
-- (without it, a sign-up without an invitation would create a coach account).
create or replace function public.free_signup_ready() returns boolean
language sql stable as $$ select true $$;
grant execute on function public.free_signup_ready() to anon, authenticated;
