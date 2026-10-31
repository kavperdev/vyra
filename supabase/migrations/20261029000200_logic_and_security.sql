-- VYRA · access helpers, triggers, RPCs, row level security, grants

-- ================================================================ access helpers
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'coach' from public.profiles where id = auth.uid()), false)
$$;

-- Any link (active or archived): the coach may read the athlete's history.
create or replace function public.is_coach_of(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coach_athletes
                 where coach_id = auth.uid() and athlete_id = p_athlete)
$$;

-- Active link: the coach may plan for and edit data of the athlete.
create or replace function public.is_active_coach_of(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coach_athletes ca
                 join public.profiles p on p.id = ca.coach_id and p.role = 'coach'
                 where ca.coach_id = auth.uid() and ca.athlete_id = p_athlete and ca.status = 'active')
$$;

create or replace function public.can_view_athlete(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_athlete = auth.uid() or public.is_coach_of(p_athlete)
$$;

create or replace function public.can_edit_athlete_data(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_athlete = auth.uid() or public.is_active_coach_of(p_athlete)
$$;

create or replace function public.can_view_session(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.can_view_athlete(athlete_id) from public.training_sessions where id = p_session), false)
$$;

create or replace function public.can_manage_session(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.is_active_coach_of(athlete_id) from public.training_sessions where id = p_session), false)
$$;

create or replace function public.exercise_session(p_exercise uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select session_id from public.strength_exercises where id = p_exercise
$$;

create or replace function public.can_view_execution(p_execution uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.can_view_athlete(athlete_id) from public.workout_executions where id = p_execution), false)
$$;

create or replace function public.owns_execution(p_execution uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workout_executions where id = p_execution and athlete_id = auth.uid())
$$;

create or replace function public.exercise_result_execution(p_result uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select execution_id from public.exercise_execution_results where id = p_result
$$;

-- ================================================================ plan snapshot
create or replace function public.session_snapshot(p_session uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'session', to_jsonb(s) - 'status',
    'running', (select to_jsonb(r) - 'session_id' from public.running_workouts r where r.session_id = s.id),
    'segments', coalesce((select jsonb_agg(to_jsonb(g) - 'session_id' order by g.position)
                          from public.running_segments g where g.session_id = s.id), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg((to_jsonb(e) - 'session_id') || jsonb_build_object('sets',
                              coalesce((select jsonb_agg(to_jsonb(x) - 'exercise_id' order by x.position)
                                        from public.strength_sets x where x.exercise_id = e.id), '[]'::jsonb))
                              order by e.position)
                           from public.strength_exercises e where e.session_id = s.id), '[]'::jsonb),
    'captured_at', now())
  from public.training_sessions s where s.id = p_session
$$;

-- ================================================================ notifications helper
create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text, p_session uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, link, session_id)
  values (p_user, p_type, p_title, p_body, p_link, p_session)
$$;

-- ================================================================ sign-up & invitations
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_token text := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_inv   public.invitations;
begin
  if v_token is not null then
    select * into v_inv from public.invitations where token = v_token for update;
    if not found or v_inv.status <> 'pending' or v_inv.expires_at < now() then
      raise exception 'INVITE_INVALID' using errcode = 'P0001';
    end if;
    if lower(v_inv.email) <> lower(coalesce(new.email, '')) then
      raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001';
    end if;
    insert into public.profiles (id, role, full_name, email)
      values (new.id, 'athlete', coalesce(v_name, v_inv.full_name, split_part(new.email, '@', 1)), new.email);
    insert into public.athlete_profiles (athlete_id) values (new.id);
    insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, new.id) on conflict do nothing;
    update public.invitations set status = 'accepted', accepted_by = new.id, accepted_at = now() where id = v_inv.id;
    perform public.notify(v_inv.coach_id, 'invite_accepted',
      coalesce(v_name, v_inv.full_name, new.email) || ' dołączył(a) do zespołu', null,
      '/coach/athletes/' || new.id, null);
  else
    if coalesce((select value from public.app_config where key = 'coach_signup'), 'open') <> 'open' then
      raise exception 'COACH_SIGNUP_CLOSED' using errcode = 'P0001';
    end if;
    insert into public.profiles (id, role, full_name, email)
      values (new.id, 'coach', coalesce(v_name, split_part(new.email, '@', 1)), new.email);
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when the address changes in Auth.
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Public, token-gated read of one invitation (for the invite landing page).
create or replace function public.get_invitation(p_token text)
returns table (email text, full_name text, coach_name text, status public.invite_status, expired boolean)
language sql stable security definer set search_path = public as $$
  select i.email, i.full_name, p.full_name, i.status, i.expires_at < now()
  from public.invitations i join public.profiles p on p.id = i.coach_id
  where i.token = p_token
$$;

-- An already signed-in athlete (existing account) accepts an invitation.
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
  if lower(v_inv.email) <> lower(coalesce(v_me.email, '')) then
    raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;
  insert into public.coach_athletes (coach_id, athlete_id) values (v_inv.coach_id, v_me.id)
    on conflict (coach_id, athlete_id) do update set status = 'active';
  insert into public.athlete_profiles (athlete_id) values (v_me.id) on conflict do nothing;
  update public.invitations set status = 'accepted', accepted_by = v_me.id, accepted_at = now() where id = v_inv.id;
  perform public.notify(v_inv.coach_id, 'invite_accepted', v_me.full_name || ' dołączył(a) do zespołu', null,
    '/coach/athletes/' || v_me.id, null);
  return v_inv.coach_id;
end $$;

-- ================================================================ sessions: versioning & protected fields
create or replace function public.training_sessions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.athlete_id <> old.athlete_id or new.coach_id <> old.coach_id then
    raise exception 'SESSION_OWNER_IMMUTABLE' using errcode = 'P0001';
  end if;
  -- Status is derived from executions; clients cannot set it directly.
  if new.status is distinct from old.status and coalesce(current_setting('vyra.internal', true), '') <> 'on' then
    new.status := old.status;
  end if;
  if (new.title, new.kind, new.category, new.scheduled_date, new.scheduled_time, new.goal, new.instructions,
      new.notes, new.planned_rpe, new.planned_duration_s, new.plan_id)
     is distinct from
     (old.title, old.kind, old.category, old.scheduled_date, old.scheduled_time, old.goal, old.instructions,
      old.notes, old.planned_rpe, old.planned_duration_s, old.plan_id) then
    new.version := old.version + 1;
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger training_sessions_guard before update on public.training_sessions
  for each row execute function public.training_sessions_guard();

create or replace function public.training_sessions_new_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := 'planned';
  new.version := 1;
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.updated_by := new.created_by;
  if new.plan_id is not null and not exists (
    select 1 from public.training_plans where id = new.plan_id and athlete_id = new.athlete_id) then
    raise exception 'PLAN_ATHLETE_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger training_sessions_new_guard before insert on public.training_sessions
  for each row execute function public.training_sessions_new_guard();

create or replace function public.training_sessions_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.athlete_id, 'session_assigned', 'Nowy trening: ' || new.title,
      to_char(new.scheduled_date, 'DD.MM.YYYY'), '/athlete/sessions/' || new.id, new.id);
  elsif new.scheduled_date is distinct from old.scheduled_date then
    perform public.notify(new.athlete_id, 'session_rescheduled', 'Zmiana terminu: ' || new.title,
      to_char(old.scheduled_date, 'DD.MM') || ' → ' || to_char(new.scheduled_date, 'DD.MM.YYYY'),
      '/athlete/sessions/' || new.id, new.id);
  elsif new.version > old.version and new.status = 'planned' then
    perform public.notify(new.athlete_id, 'session_updated', 'Trener zmienił trening: ' || new.title,
      to_char(new.scheduled_date, 'DD.MM.YYYY'), '/athlete/sessions/' || new.id, new.id);
  end if;
  return null;
end $$;
create trigger training_sessions_notify after insert or update on public.training_sessions
  for each row execute function public.training_sessions_notify();

-- ================================================================ executions
create or replace function public.workout_executions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_session public.training_sessions;
begin
  if tg_op = 'INSERT' then
    select * into v_session from public.training_sessions where id = new.session_id;
    if not found then raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001'; end if;
    if v_session.athlete_id <> new.athlete_id then
      raise exception 'EXECUTION_ATHLETE_MISMATCH' using errcode = 'P0001';
    end if;
    new.plan_snapshot := public.session_snapshot(new.session_id);
    new.plan_version := v_session.version;
  else
    -- Identity and the frozen plan never change after the first save.
    new.session_id := old.session_id;
    new.athlete_id := old.athlete_id;
    new.plan_snapshot := old.plan_snapshot;
    new.plan_version := old.plan_version;
    new.created_at := old.created_at;
  end if;
  if new.status in ('completed', 'partial', 'skipped') and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end $$;
create trigger workout_executions_guard before insert or update on public.workout_executions
  for each row execute function public.workout_executions_guard();

create or replace function public.sync_session_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_session uuid := coalesce(new.session_id, old.session_id);
  v_status  public.session_status;
begin
  v_status := case when tg_op = 'DELETE' then 'planned'::public.session_status
                   else new.status::text::public.session_status end;
  perform set_config('vyra.internal', 'on', true);
  update public.training_sessions set status = v_status where id = v_session;
  perform set_config('vyra.internal', 'off', true);

  if tg_op <> 'DELETE' and new.status in ('completed', 'partial', 'skipped')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.notify(s.coach_id, 'execution_logged',
      p.full_name || case new.status when 'completed' then ' wykonał(a): '
                                     when 'partial' then ' wykonał(a) częściowo: '
                                     else ' pominął(a): ' end || s.title,
      to_char(s.scheduled_date, 'DD.MM.YYYY'), '/coach/sessions/' || s.id, s.id)
    from public.training_sessions s join public.profiles p on p.id = s.athlete_id
    where s.id = v_session;
  end if;
  return null;
end $$;
create trigger workout_executions_sync after insert or update or delete on public.workout_executions
  for each row execute function public.sync_session_status();

create or replace function public.exercise_results_fill_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.exercise_id is not null and coalesce(new.exercise_name, '') = '' then
    select name into new.exercise_name from public.strength_exercises where id = new.exercise_id;
  end if;
  return new;
end $$;
create trigger exercise_results_fill_name before insert or update on public.exercise_execution_results
  for each row execute function public.exercise_results_fill_name();

-- ================================================================ comments → notifications
create or replace function public.training_comments_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_s public.training_sessions;
  v_author text;
begin
  select * into v_s from public.training_sessions where id = new.session_id;
  select full_name into v_author from public.profiles where id = new.author_id;
  if new.author_id = v_s.athlete_id then
    perform public.notify(v_s.coach_id, 'comment', v_author || ' skomentował(a): ' || v_s.title,
      left(new.body, 160), '/coach/sessions/' || v_s.id, v_s.id);
  else
    perform public.notify(v_s.athlete_id, 'comment', 'Komentarz trenera: ' || v_s.title,
      left(new.body, 160), '/athlete/sessions/' || v_s.id, v_s.id);
  end if;
  return null;
end $$;
create trigger training_comments_notify after insert on public.training_comments
  for each row execute function public.training_comments_notify();

create or replace function public.training_comments_guard() returns trigger
language plpgsql as $$
begin
  new.author_id := old.author_id;
  new.session_id := old.session_id;
  return new;
end $$;
create trigger training_comments_guard before update on public.training_comments
  for each row execute function public.training_comments_guard();

-- ================================================================ reminders (run daily with pg_cron, see README)
create or replace function public.create_session_reminders(p_day date default current_date + 1) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into public.notifications (user_id, type, title, body, link, session_id)
  select s.athlete_id, 'reminder', 'Jutro: ' || s.title,
         to_char(s.scheduled_date, 'DD.MM.YYYY') || coalesce(' · ' || to_char(s.scheduled_time, 'HH24:MI'), ''),
         '/athlete/sessions/' || s.id, s.id
  from public.training_sessions s
  where s.scheduled_date = p_day and s.status = 'planned'
    and not exists (select 1 from public.notifications n where n.session_id = s.id and n.type = 'reminder');
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ================================================================ row level security
alter table public.profiles                    enable row level security;
alter table public.athlete_profiles            enable row level security;
alter table public.coach_athletes              enable row level security;
alter table public.coach_notes                 enable row level security;
alter table public.app_config                  enable row level security;
alter table public.invitations                 enable row level security;
alter table public.training_plans              enable row level security;
alter table public.training_templates          enable row level security;
alter table public.training_sessions           enable row level security;
alter table public.running_workouts            enable row level security;
alter table public.running_segments            enable row level security;
alter table public.strength_exercises          enable row level security;
alter table public.strength_sets               enable row level security;
alter table public.workout_executions          enable row level security;
alter table public.running_execution_results   enable row level security;
alter table public.running_lap_results         enable row level security;
alter table public.exercise_execution_results  enable row level security;
alter table public.set_execution_results       enable row level security;
alter table public.training_comments           enable row level security;
alter table public.personal_records            enable row level security;
alter table public.athlete_goals               enable row level security;
alter table public.notifications               enable row level security;

-- profiles: yourself, your athletes, your coaches
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_coach_of(id)
  or exists (select 1 from public.coach_athletes ca where ca.athlete_id = auth.uid() and ca.coach_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy athlete_profiles_select on public.athlete_profiles for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy athlete_profiles_insert on public.athlete_profiles for insert to authenticated
  with check (public.can_edit_athlete_data(athlete_id));
create policy athlete_profiles_update on public.athlete_profiles for update to authenticated
  using (public.can_edit_athlete_data(athlete_id)) with check (public.can_edit_athlete_data(athlete_id));

create policy coach_athletes_select on public.coach_athletes for select to authenticated
  using (coach_id = auth.uid() or athlete_id = auth.uid());
create policy coach_athletes_update on public.coach_athletes for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy coach_notes_all on public.coach_notes for all to authenticated
  using (coach_id = auth.uid() and public.is_coach_of(athlete_id))
  with check (coach_id = auth.uid() and public.is_active_coach_of(athlete_id));

-- app_config: no client policies → no client access.

create policy invitations_select on public.invitations for select to authenticated
  using (coach_id = auth.uid());
create policy invitations_insert on public.invitations for insert to authenticated
  with check (coach_id = auth.uid() and public.is_coach() and status = 'pending');
create policy invitations_update on public.invitations for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and status in ('pending', 'revoked'));
create policy invitations_delete on public.invitations for delete to authenticated
  using (coach_id = auth.uid() and status <> 'accepted');

create policy training_plans_select on public.training_plans for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy training_plans_write on public.training_plans for all to authenticated
  using (coach_id = auth.uid() and public.is_active_coach_of(athlete_id))
  with check (coach_id = auth.uid() and public.is_active_coach_of(athlete_id));

create policy training_templates_all on public.training_templates for all to authenticated
  using (coach_id = auth.uid() and public.is_coach())
  with check (coach_id = auth.uid() and public.is_coach());

create policy training_sessions_select on public.training_sessions for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy training_sessions_insert on public.training_sessions for insert to authenticated
  with check (coach_id = auth.uid() and public.is_active_coach_of(athlete_id));
create policy training_sessions_update on public.training_sessions for update to authenticated
  using (public.is_active_coach_of(athlete_id))
  with check (coach_id = auth.uid() and public.is_active_coach_of(athlete_id));
create policy training_sessions_delete on public.training_sessions for delete to authenticated
  using (public.is_active_coach_of(athlete_id));

create policy running_workouts_select on public.running_workouts for select to authenticated
  using (public.can_view_session(session_id));
create policy running_workouts_write on public.running_workouts for all to authenticated
  using (public.can_manage_session(session_id)) with check (public.can_manage_session(session_id));

create policy running_segments_select on public.running_segments for select to authenticated
  using (public.can_view_session(session_id));
create policy running_segments_write on public.running_segments for all to authenticated
  using (public.can_manage_session(session_id)) with check (public.can_manage_session(session_id));

create policy strength_exercises_select on public.strength_exercises for select to authenticated
  using (public.can_view_session(session_id));
create policy strength_exercises_write on public.strength_exercises for all to authenticated
  using (public.can_manage_session(session_id)) with check (public.can_manage_session(session_id));

create policy strength_sets_select on public.strength_sets for select to authenticated
  using (public.can_view_session(public.exercise_session(exercise_id)));
create policy strength_sets_write on public.strength_sets for all to authenticated
  using (public.can_manage_session(public.exercise_session(exercise_id)))
  with check (public.can_manage_session(public.exercise_session(exercise_id)));

create policy workout_executions_select on public.workout_executions for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy workout_executions_insert on public.workout_executions for insert to authenticated
  with check (athlete_id = auth.uid()
              and exists (select 1 from public.training_sessions s where s.id = session_id and s.athlete_id = auth.uid()));
create policy workout_executions_update on public.workout_executions for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy workout_executions_delete on public.workout_executions for delete to authenticated
  using (athlete_id = auth.uid());

create policy running_execution_results_select on public.running_execution_results for select to authenticated
  using (public.can_view_execution(execution_id));
create policy running_execution_results_write on public.running_execution_results for all to authenticated
  using (public.owns_execution(execution_id)) with check (public.owns_execution(execution_id));

create policy running_lap_results_select on public.running_lap_results for select to authenticated
  using (public.can_view_execution(execution_id));
create policy running_lap_results_write on public.running_lap_results for all to authenticated
  using (public.owns_execution(execution_id)) with check (public.owns_execution(execution_id));

create policy exercise_execution_results_select on public.exercise_execution_results for select to authenticated
  using (public.can_view_execution(execution_id));
create policy exercise_execution_results_write on public.exercise_execution_results for all to authenticated
  using (public.owns_execution(execution_id)) with check (public.owns_execution(execution_id));

create policy set_execution_results_select on public.set_execution_results for select to authenticated
  using (public.can_view_execution(public.exercise_result_execution(exercise_result_id)));
create policy set_execution_results_write on public.set_execution_results for all to authenticated
  using (public.owns_execution(public.exercise_result_execution(exercise_result_id)))
  with check (public.owns_execution(public.exercise_result_execution(exercise_result_id)));

create policy training_comments_select on public.training_comments for select to authenticated
  using (public.can_view_session(session_id));
create policy training_comments_insert on public.training_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_session(session_id));
create policy training_comments_update on public.training_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy training_comments_delete on public.training_comments for delete to authenticated
  using (author_id = auth.uid());

create policy personal_records_select on public.personal_records for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy personal_records_write on public.personal_records for all to authenticated
  using (public.can_edit_athlete_data(athlete_id)) with check (public.can_edit_athlete_data(athlete_id));

create policy athlete_goals_select on public.athlete_goals for select to authenticated
  using (public.can_view_athlete(athlete_id));
create policy athlete_goals_write on public.athlete_goals for all to authenticated
  using (public.can_edit_athlete_data(athlete_id)) with check (public.can_edit_athlete_data(athlete_id));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ================================================================ grants
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- columns a user may change on their own profile (never the role)
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, timezone) on public.profiles to authenticated;

-- links are created by invitation functions only
revoke insert, update, delete on public.coach_athletes from authenticated;
grant update (status) on public.coach_athletes to authenticated;

revoke all on public.app_config from authenticated;

revoke update on public.invitations from authenticated;
grant update (status) on public.invitations to authenticated;

-- coaches change the plan, never the owner or the derived status
revoke update on public.training_sessions from authenticated;
grant update (plan_id, template_id, kind, category, title, scheduled_date, scheduled_time, goal, instructions,
              notes, planned_rpe, planned_duration_s) on public.training_sessions to authenticated;

revoke update on public.workout_executions from authenticated;
grant update (status, performed_on, started_at, completed_at, rpe, feeling, comment) on public.workout_executions to authenticated;

-- notifications are written by triggers only; users can mark them read or delete them
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.training_comments from authenticated;
grant update (body) on public.training_comments to authenticated;

-- functions
revoke execute on function public.create_session_reminders(date) from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.session_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
