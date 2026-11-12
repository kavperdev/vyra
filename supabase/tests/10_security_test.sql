-- Security and data-integrity tests for the VYRA schema.
-- Run with scripts/test-db.sh (plain PostgreSQL) — every failed assertion aborts with an error.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------- helpers
create or replace function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  execute 'set role authenticated';
  perform set_config('request.jwt.claim.sub', p::text, false);
end $$;

create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;

set client_min_messages = notice;

-- ---------------------------------------------------------------- 1. sign-up: coach + invited athletes
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'coach@vyra.test', '{"full_name":"Kacper Trener"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'other@vyra.test', '{"full_name":"Obcy Trener"}');

select pg_temp.check((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'coach',
  'sign-up without invitation creates a coach');

-- coach invites two athletes
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.invitations (coach_id, email, full_name, token) values
  ('00000000-0000-0000-0000-0000000000c1', 'ala@vyra.test', 'Ala Biegaczka', 'tok-ala'),
  ('00000000-0000-0000-0000-0000000000c1', 'olek@vyra.test', 'Olek Sprinter', 'tok-olek');
select pg_temp.as_admin();

-- wrong e-mail for a token is rejected
do $$ begin
  insert into auth.users (email, raw_user_meta_data) values ('intruz@vyra.test', '{"invite_token":"tok-ala"}');
  raise exception 'FAIL: sign-up with a mismatched invitation e-mail succeeded';
exception when others then
  if sqlerrm not like '%INVITE_EMAIL_MISMATCH%' then raise; end if;
  raise notice 'ok  invitation is bound to its e-mail address';
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ala@vyra.test', '{"invite_token":"tok-ala","full_name":"Ala"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'olek@vyra.test', '{"invite_token":"tok-olek","full_name":"Olek"}');

select pg_temp.check((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'athlete',
  'invited sign-up creates an athlete');
select pg_temp.check(exists (select 1 from public.coach_athletes
  where coach_id = '00000000-0000-0000-0000-0000000000c1' and athlete_id = '00000000-0000-0000-0000-0000000000a1'),
  'invited athlete is linked to the inviting coach');
select pg_temp.check((select status from public.invitations where token = 'tok-ala') = 'accepted',
  'invitation is marked accepted');

-- a used token cannot be reused
do $$ begin
  insert into auth.users (email, raw_user_meta_data) values ('ala@vyra.test', '{"invite_token":"tok-ala"}');
  raise exception 'FAIL: reused invitation accepted';
exception when others then
  if sqlerrm not like '%INVITE_INVALID%' then raise; end if;
  raise notice 'ok  accepted invitation cannot be reused';
end $$;

-- ---------------------------------------------------------------- 2. role escalation
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  update public.profiles set role = 'coach' where id = auth.uid();
  raise exception 'FAIL: athlete changed own role';
exception when insufficient_privilege then raise notice 'ok  athlete cannot change own role';
end $$;
update public.profiles set full_name = 'Ala B.' where id = auth.uid();
select pg_temp.check((select full_name from public.profiles where id = auth.uid()) = 'Ala B.',
  'athlete can edit own name');
do $$ begin
  insert into public.coach_athletes (coach_id, athlete_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2');
  raise exception 'FAIL: athlete created a coach link';
exception when insufficient_privilege then raise notice 'ok  athletes cannot create coach links';
end $$;

-- ---------------------------------------------------------------- 3. coach plans individual sessions
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.training_sessions (id, coach_id, athlete_id, kind, category, title, scheduled_date)
values ('10000000-0000-0000-0000-000000000001', auth.uid(), '00000000-0000-0000-0000-0000000000a1',
        'running', 'intervals', '6×800 m', current_date),
       ('10000000-0000-0000-0000-000000000002', auth.uid(), '00000000-0000-0000-0000-0000000000a2',
        'strength', 'strength', 'Siła A', current_date),
       ('10000000-0000-0000-0000-000000000003', auth.uid(), '00000000-0000-0000-0000-0000000000a1',
        'running', 'easy', 'Easy 10 km', current_date + 2);
insert into public.running_workouts (session_id, structure, planned_distance_m, target_pace_min_s, target_pace_max_s)
values ('10000000-0000-0000-0000-000000000001', 'intervals', 10000, 300, 300);
insert into public.running_segments (session_id, position, segment_type, repeats, distance_m, target_pace_min_s,
                                     target_pace_max_s, recovery_type, recovery_duration_s)
values ('10000000-0000-0000-0000-000000000001', 1, 'warmup', 1, 3000, null, null, null, null),
       ('10000000-0000-0000-0000-000000000001', 2, 'work', 6, 800, 200, 204, 'jog', 120),
       ('10000000-0000-0000-0000-000000000001', 3, 'cooldown', 1, 2000, null, null, null, null);
insert into public.strength_exercises (id, session_id, position, name, rest_s)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1, 'Przysiad', 120);
insert into public.strength_sets (exercise_id, position, planned_reps, planned_load_kg) values
  ('20000000-0000-0000-0000-000000000001', 1, 10, 40),
  ('20000000-0000-0000-0000-000000000001', 2, 8, 45),
  ('20000000-0000-0000-0000-000000000001', 3, 6, 50);
select pg_temp.check((select count(*) from public.training_sessions) = 3, 'coach sees all own athletes'' sessions');

-- the other coach sees nothing and cannot plan for someone else's athlete
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.training_sessions) = 0, 'foreign coach sees no sessions');
select pg_temp.check((select count(*) from public.profiles where role = 'athlete') = 0, 'unassigned staff sees no athletes');
do $$ begin
  insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000a1', 'running', 'easy', 'hack', current_date);
  raise exception 'FAIL: foreign coach planned a session';
exception when insufficient_privilege then raise notice 'ok  foreign coach cannot plan for another coach''s athlete';
end $$;

-- ---------------------------------------------------------------- 4. athlete isolation
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.training_sessions) = 2, 'athlete sees only own sessions');
select pg_temp.check(not exists (select 1 from public.training_sessions where id = '10000000-0000-0000-0000-000000000002'),
  'athlete cannot read another athlete''s session by id');
select pg_temp.check((select count(*) from public.strength_sets) = 0, 'athlete cannot read another athlete''s sets');
select pg_temp.check((select count(*) from public.running_segments) = 3, 'athlete reads own segments');
select pg_temp.check((select count(*) from public.profiles) = 2, 'athlete sees self and own coach only');

update public.training_sessions set title = 'hack' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.check((select title from public.training_sessions where id = '10000000-0000-0000-0000-000000000001') = '6×800 m',
  'athlete cannot edit the coach''s plan');
delete from public.running_segments;
select pg_temp.check((select count(*) from public.running_segments) = 3, 'athlete cannot delete plan segments');

-- ---------------------------------------------------------------- 5. execution is stored apart from the plan
insert into public.workout_executions (id, session_id, athlete_id, status, rpe, comment)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', auth.uid(), 'completed', 8, 'Ciężko na końcu');
insert into public.running_execution_results (execution_id, distance_m, duration_s, avg_pace_s, avg_hr)
values ('30000000-0000-0000-0000-000000000001', 10150, 2950, 291, 162);

select pg_temp.check((select status from public.training_sessions where id = '10000000-0000-0000-0000-000000000001') = 'completed',
  'logging an execution marks the session completed');
select pg_temp.check((select plan_snapshot -> 'running' ->> 'planned_distance_m' from public.workout_executions
  where id = '30000000-0000-0000-0000-000000000001') = '10000',
  'execution keeps a snapshot of the planned values');
select pg_temp.check((select jsonb_array_length(plan_snapshot -> 'segments') from public.workout_executions
  where id = '30000000-0000-0000-0000-000000000001') = 3, 'snapshot includes all segments');

do $$ begin
  insert into public.workout_executions (session_id, athlete_id, status)
  values ('10000000-0000-0000-0000-000000000002', auth.uid(), 'completed');
  raise exception 'FAIL: athlete logged an execution for someone else''s session';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  athlete cannot log another athlete''s session';
end $$;

-- coach edits the plan afterwards: execution and snapshot stay intact, version increases
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.running_workouts set planned_distance_m = 12000 where session_id = '10000000-0000-0000-0000-000000000001';
update public.training_sessions set title = '6×800 m (zmiana)' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.check((select version from public.training_sessions where id = '10000000-0000-0000-0000-000000000001') = 2,
  'plan edit bumps the version');
select pg_temp.check((select plan_snapshot -> 'running' ->> 'planned_distance_m' from public.workout_executions
  where id = '30000000-0000-0000-0000-000000000001') = '10000', 'plan edit does not alter the execution snapshot');
select pg_temp.check((select distance_m from public.running_execution_results
  where execution_id = '30000000-0000-0000-0000-000000000001') = 10150, 'plan edit does not alter actual results');

-- coach cannot set status directly or change the session owner
update public.training_sessions set title = title where id = '10000000-0000-0000-0000-000000000003';
do $$ begin
  update public.training_sessions set status = 'completed' where id = '10000000-0000-0000-0000-000000000003';
  raise exception 'FAIL: coach set session status directly';
exception when insufficient_privilege then raise notice 'ok  status is derived from executions only';
end $$;

-- coach cannot alter the athlete's results
update public.running_execution_results set distance_m = 1 where execution_id = '30000000-0000-0000-0000-000000000001';
select pg_temp.check((select distance_m from public.running_execution_results
  where execution_id = '30000000-0000-0000-0000-000000000001') = 10150, 'coach cannot overwrite athlete results');

-- an executed session cannot be deleted (history survives)
do $$ begin
  delete from public.training_sessions where id = '10000000-0000-0000-0000-000000000001';
  raise exception 'FAIL: executed session was deleted';
exception when foreign_key_violation then raise notice 'ok  executed session cannot be deleted';
end $$;
delete from public.training_sessions where id = '10000000-0000-0000-0000-000000000003';
select pg_temp.check(not exists (select 1 from public.training_sessions where id = '10000000-0000-0000-0000-000000000003'),
  'unexecuted future session can be deleted');

-- ---------------------------------------------------------------- 6. strength: per-set planned vs actual
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
insert into public.workout_executions (id, session_id, athlete_id, status)
values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', auth.uid(), 'partial');
insert into public.exercise_execution_results (id, execution_id, exercise_id, position, status)
values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001', 1, 'partial');
insert into public.set_execution_results (exercise_result_id, set_id, position, reps, load_kg)
select '40000000-0000-0000-0000-000000000001', id, position, planned_reps - 1, planned_load_kg + 2.5
from public.strength_sets where exercise_id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check((select exercise_name from public.exercise_execution_results
  where id = '40000000-0000-0000-0000-000000000001') = 'Przysiad', 'exercise name is captured with the result');
select pg_temp.check((select sum(reps) from public.set_execution_results) = 21, 'actual reps stored per set');
select pg_temp.check((select sum(planned_reps) from public.strength_sets) = 24, 'planned reps unchanged');
select pg_temp.check((select status from public.training_sessions where id = '10000000-0000-0000-0000-000000000002') = 'partial',
  'partial execution marks the session partial');

-- athlete a1 cannot see a2's results
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.set_execution_results) = 0, 'other athletes'' set results are hidden');
select pg_temp.check((select count(*) from public.workout_executions) = 1, 'athlete sees only own executions');

-- ---------------------------------------------------------------- 7. comments and notifications
insert into public.training_comments (session_id, body) values ('10000000-0000-0000-0000-000000000001', 'Ostatnie 2 odcinki ciężko.');
do $$ begin
  insert into public.training_comments (session_id, body) values ('10000000-0000-0000-0000-000000000002', 'spam');
  raise exception 'FAIL: commented on a foreign session';
exception when insufficient_privilege then raise notice 'ok  cannot comment on another athlete''s session';
end $$;
select pg_temp.check((select count(*) from public.notifications where type = 'session_assigned') = 1,
  'athlete has a notification for the assigned session');
select pg_temp.check((select count(*) from public.notifications) >= 1 and
  not exists (select 1 from public.notifications where user_id <> auth.uid()), 'athlete sees only own notifications');
do $$ begin
  insert into public.notifications (user_id, type, title) values (auth.uid(), 'comment', 'fake');
  raise exception 'FAIL: client created a notification';
exception when insufficient_privilege then raise notice 'ok  clients cannot fabricate notifications';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check(exists (select 1 from public.notifications where type = 'comment'), 'coach notified about athlete comment');
select pg_temp.check(exists (select 1 from public.notifications where type = 'execution_logged'), 'coach notified about logged execution');
select pg_temp.check(exists (select 1 from public.notifications where type = 'invite_accepted'), 'coach notified about accepted invitation');

-- ---------------------------------------------------------------- 8. private coach notes, records, goals
insert into public.coach_notes (athlete_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'Uważać na prawe kolano.');
insert into public.personal_records (athlete_id, kind, label, distance_m, value, unit, achieved_on, source)
values ('00000000-0000-0000-0000-0000000000a1', 'running', '5 km', 5000, 1065, 's', current_date, 'race');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.coach_notes) = 0, 'athlete cannot read private coach notes');
select pg_temp.check((select count(*) from public.personal_records) = 1, 'athlete reads own records');
insert into public.athlete_goals (athlete_id, name, target_value, unit, lower_is_better)
values (auth.uid(), '5 km poniżej 17:00', 1020, 's', true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.personal_records) = 0, 'records of other athletes are hidden');
select pg_temp.check((select count(*) from public.athlete_goals) = 0, 'goals of other athletes are hidden');

-- ---------------------------------------------------------------- 9. invitations & templates are per coach
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.invitations) = 0, 'coach cannot see another coach''s invitations');
insert into public.training_templates (coach_id, name, kind, category, payload) values (auth.uid(), 'Moje', 'running', 'easy', '{}');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.training_templates) = 0, 'templates are private to their coach');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  insert into public.training_templates (coach_id, name, kind, category) values (auth.uid(), 'x', 'running', 'easy');
  raise exception 'FAIL: athlete created a template';
exception when insufficient_privilege then raise notice 'ok  athletes cannot create templates';
end $$;
do $$ begin
  perform public.create_session_reminders();
  raise exception 'FAIL: client ran the reminder job';
exception when insufficient_privilege then raise notice 'ok  reminder job is server-only';
end $$;

-- ---------------------------------------------------------------- 10. archiving keeps history readable, blocks new plans
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.coach_athletes set status = 'archived' where athlete_id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.check(exists (select 1 from public.workout_executions where athlete_id = '00000000-0000-0000-0000-0000000000a2'),
  'coach still reads archived athlete history');
do $$ begin
  insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', 'running', 'easy', 'po archiwizacji', current_date);
  raise exception 'FAIL: planned for archived athlete';
exception when insufficient_privilege then raise notice 'ok  no new plans for archived athletes';
end $$;

-- ---------------------------------------------------------------- 11. closing coach sign-up
select pg_temp.as_admin();
update public.app_config set value = 'closed' where key = 'coach_signup';
do $$ begin
  insert into auth.users (email) values ('nowy@vyra.test');
  raise exception 'FAIL: coach sign-up while closed';
exception when others then
  if sqlerrm not like '%COACH_SIGNUP_CLOSED%' then raise; end if;
  raise notice 'ok  coach sign-up can be closed';
end $$;

select pg_temp.check((select public.create_session_reminders(current_date)) >= 0, 'reminder job runs for the server');


-- ---------------------------------------------------------------- 12. transactional write functions
update public.app_config set value = 'open' where key = 'coach_signup';
update public.coach_athletes set status = 'active';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');

create temp table t_ids (k text primary key, v uuid);
grant all on t_ids to authenticated;
insert into t_ids values ('s', public.save_session(jsonb_build_object(
  'athlete_id', '00000000-0000-0000-0000-0000000000a1', 'kind', 'running', 'category', 'intervals',
  'title', 'Drabinka 400-800-1000-400-200', 'scheduled_date', current_date + 1,
  'running', jsonb_build_object('structure', 'intervals', 'planned_distance_m', 9000),
  'segments', jsonb_build_array(
    jsonb_build_object('segment_type', 'warmup', 'distance_m', 3000),
    jsonb_build_object('segment_type', 'work', 'distance_m', 400, 'target_pace_min_s', 190, 'recovery_type', 'jog', 'recovery_duration_s', 90),
    jsonb_build_object('segment_type', 'work', 'distance_m', 800, 'target_pace_min_s', 200),
    jsonb_build_object('segment_type', 'work', 'distance_m', 1000, 'target_pace_min_s', 205),
    jsonb_build_object('segment_type', 'work', 'distance_m', 400, 'target_pace_min_s', 190),
    jsonb_build_object('segment_type', 'work', 'distance_m', 200, 'target_pace_min_s', 175),
    jsonb_build_object('segment_type', 'cooldown', 'distance_m', 2000)))));
select pg_temp.check((select count(*) from public.running_segments where session_id = (select v from t_ids where k = 's')) = 7,
  'save_session stores mixed-distance interval segments');

-- edit: keep the first segment id, drop the rest, add one
select public.save_session(public.session_payload((select v from t_ids where k = 's'))
  || jsonb_build_object('id', (select v from t_ids where k = 's'), 'title', 'Krótsza drabinka',
     'segments', jsonb_build_array(
        jsonb_build_object('id', (select id from public.running_segments where session_id = (select v from t_ids where k = 's') and position = 1),
                           'segment_type', 'warmup', 'distance_m', 2500),
        jsonb_build_object('segment_type', 'work', 'repeats', 5, 'distance_m', 600))));
select pg_temp.check((select count(*) from public.running_segments where session_id = (select v from t_ids where k = 's')) = 2,
  'editing replaces removed segments');
select pg_temp.check((select distance_m from public.running_segments where session_id = (select v from t_ids where k = 's') and position = 1) = 2500,
  'editing updates kept segments in place');

-- strength with varied sets, then copy to two athletes
insert into t_ids values ('st', public.save_session(jsonb_build_object(
  'athlete_id', '00000000-0000-0000-0000-0000000000a1', 'kind', 'strength', 'category', 'strength',
  'title', 'Siła B', 'scheduled_date', current_date + 3,
  'exercises', jsonb_build_array(
    jsonb_build_object('name', 'Martwy ciąg rumuński', 'rest_s', 120, 'sets', jsonb_build_array(
      jsonb_build_object('planned_reps', 10, 'planned_load_kg', 40),
      jsonb_build_object('planned_reps', 8, 'planned_load_kg', 45),
      jsonb_build_object('planned_reps', 6, 'planned_load_kg', 50))),
    jsonb_build_object('name', 'Plank boczny', 'sets', jsonb_build_array(jsonb_build_object('planned_duration_s', 40)))))));
select pg_temp.check((select count(*) from public.strength_sets x join public.strength_exercises e on e.id = x.exercise_id
  where e.session_id = (select v from t_ids where k = 'st')) = 4, 'save_session stores exercises with individual sets');

select pg_temp.check(array_length(public.create_sessions(public.session_payload((select v from t_ids where k = 'st')),
  array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2']::uuid[]), 1) = 2,
  'create_sessions assigns one plan to several athletes');
select pg_temp.check(public.copy_session((select v from t_ids where k = 'st'), current_date + 10) is not null, 'copy_session duplicates a plan');

-- copy_week: whole week to a later week, one summary notification instead of one per session
select pg_temp.as_admin();
create temp table t_week as select date_trunc('week', current_date + 1)::date as mon,
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000a1') as notes_before;
grant all on t_week to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check(public.copy_week('00000000-0000-0000-0000-0000000000a1', (select mon from t_week), (select mon + 35 from t_week))
  = (select count(*) from public.training_sessions where athlete_id = '00000000-0000-0000-0000-0000000000a1'
       and scheduled_date between (select mon from t_week) and (select mon + 6 from t_week)),
  'copy_week copies every session of the week');
select pg_temp.as_admin();
select pg_temp.check((select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000a1')
  = (select notes_before from t_week) + 1, 'copy_week sends one summary notification');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  perform public.copy_week('00000000-0000-0000-0000-0000000000a1', (select mon from t_week), (select mon + 42 from t_week));
exception when others then null;
end $$;
select pg_temp.as_admin();
select pg_temp.check((select count(*) from public.training_sessions where scheduled_date >= (select mon + 42 from t_week)) = 0,
  'foreign coach cannot copy another coach''s athlete week');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');

-- athlete logs strength execution through save_execution
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.save_execution(jsonb_build_object('session_id', (select v from t_ids where k = 'st'), 'status', 'completed', 'rpe', 7,
  'exercises', (select jsonb_agg(jsonb_build_object('exercise_id', e.id, 'status', 'done', 'sets',
                  (select jsonb_agg(jsonb_build_object('set_id', x.id, 'reps', x.planned_reps, 'load_kg', coalesce(x.planned_load_kg, 0) + 5) order by x.position)
                   from public.strength_sets x where x.exercise_id = e.id)) order by e.position)
                from public.strength_exercises e where e.session_id = (select v from t_ids where k = 'st'))));
select pg_temp.check((select status from public.training_sessions where id = (select v from t_ids where k = 'st')) = 'completed',
  'save_execution completes the session');
select pg_temp.check((select sum(load_kg) from public.set_execution_results r join public.exercise_execution_results e on e.id = r.exercise_result_id
  join public.workout_executions w on w.id = e.execution_id where w.session_id = (select v from t_ids where k = 'st')) = 155,
  'actual loads stored separately from planned loads');

-- running execution: pace derived from distance and time
select public.save_execution(jsonb_build_object('session_id', (select v from t_ids where k = 's'), 'status', 'completed',
  'running', jsonb_build_object('distance_m', 8000, 'duration_s', 2400, 'avg_hr', 158),
  'laps', jsonb_build_array(jsonb_build_object('rep_index', 1, 'distance_m', 600, 'duration_s', 120))));
select pg_temp.check((select r.avg_pace_s from public.running_execution_results r join public.workout_executions w on w.id = r.execution_id
  where w.session_id = (select v from t_ids where k = 's')) = 300, 'average pace is computed from distance and time');
-- saving again updates instead of duplicating
select public.save_execution(jsonb_build_object('session_id', (select v from t_ids where k = 's'), 'status', 'partial',
  'running', jsonb_build_object('distance_m', 6000, 'duration_s', 1800)));
select pg_temp.check((select count(*) from public.workout_executions where session_id = (select v from t_ids where k = 's')) = 1,
  'saving an execution twice updates it');

-- athlete cannot use save_session
do $$ begin
  perform public.save_session(jsonb_build_object('athlete_id', auth.uid(), 'kind', 'running', 'category', 'easy',
    'title', 'samowola', 'scheduled_date', current_date));
  raise exception 'FAIL: athlete created a session via RPC';
exception when insufficient_privilege then raise notice 'ok  RPC writes still go through RLS';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform public.save_execution(jsonb_build_object('session_id', '10000000-0000-0000-0000-000000000001', 'status', 'completed'));
  raise exception 'FAIL: athlete saved execution for a foreign session';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  save_execution rejects foreign sessions';
end $$;

-- ---------------------------------------------------------------- applications (public form)
select pg_temp.as_admin();
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into public.applications (full_name, email, goal, consent) values ('Nowy Biegacz', 'nowy@vyra.test', '10 km < 40 min', true);
do $$ begin
  insert into public.applications (full_name, email, consent, status) values ('Spryciarz', 'x@vyra.test', true, 'invited');
  raise exception 'FAIL: visitor set a status other than new';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  visitors can only submit new applications';
end $$;
do $$ begin
  perform count(*) from public.applications;
  raise exception 'FAIL: visitor read applications';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read applications';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.applications) = 0, 'athletes cannot read applications');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.applications) = 1, 'coach reads applications');
update public.applications set status = 'contacted' where email = 'nowy@vyra.test';
select pg_temp.check((select status from public.applications where email = 'nowy@vyra.test') = 'contacted', 'coach updates application status');
select pg_temp.as_admin();
set role anon;
insert into public.applications (full_name, email, consent, kind) values ('Obozowicz', 'oboz@vyra.test', true, 'camp');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.applications where kind = 'camp') = 1, 'camp waitlist entries are stored');

-- ---------------------------------------------------------------- team roles
select pg_temp.as_admin();
select pg_temp.check((select staff_role from public.profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'founder',
  'first account is a founder');
select pg_temp.check((select staff_role from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') = 'running_coach',
  'later open sign-up is not a founder');

-- non-founders cannot invite staff
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  insert into public.invitations (coach_id, email, token, staff_role) values (auth.uid(), 'x@vyra.test', 'tok-x', 'founder');
  raise exception 'FAIL: non-founder invited staff';
exception when insufficient_privilege then raise notice 'ok  only founders invite staff';
end $$;

-- founder invites a physio
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.invitations (coach_id, email, full_name, token, staff_role)
  values (auth.uid(), 'fizjo@vyra.test', 'Fizjo', 'tok-fizjo', 'physio');
select pg_temp.as_admin();
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'fizjo@vyra.test', '{"invite_token":"tok-fizjo","full_name":"Fizjo"}');
select pg_temp.check((select role::text || '/' || staff_role from public.profiles where id = '00000000-0000-0000-0000-0000000000f1') = 'coach/physio',
  'staff invitation creates a staff account');

-- physio sees nothing until assigned
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select count(*) from public.training_sessions) = 0, 'unassigned physio sees no sessions');
do $$ begin
  perform public.set_staff_assignment(auth.uid(), '00000000-0000-0000-0000-0000000000a1', true);
  raise exception 'FAIL: physio assigned itself';
exception when insufficient_privilege then raise notice 'ok  only founders assign athletes';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.set_staff_assignment('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select count(*) from public.training_sessions where athlete_id = '00000000-0000-0000-0000-0000000000a1') > 0,
  'assigned physio sees the athlete''s sessions');
select pg_temp.check((select count(*) from public.training_sessions where athlete_id = '00000000-0000-0000-0000-0000000000a2') = 0,
  'assigned physio does not see other athletes');
do $$ begin
  insert into public.training_sessions (coach_id, athlete_id, kind, category, title, scheduled_date)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000a1', 'running', 'easy', 'fizjo plan', current_date);
  raise exception 'FAIL: physio planned a session';
exception when insufficient_privilege then raise notice 'ok  physio cannot plan training';
end $$;
insert into public.coach_notes (coach_id, athlete_id, body) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1', 'Napięte pasmo biodrowo-piszczelowe');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check(exists (select 1 from public.coach_notes where body like 'Napięte%'), 'founder reads team notes');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check(not exists (select 1 from public.coach_notes), 'athletes never see team notes');

-- new athlete of any coach is visible to founders
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
insert into public.invitations (coach_id, email, token) values (auth.uid(), 'nowa@vyra.test', 'tok-nowa');
select pg_temp.as_admin();
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a9', 'nowa@vyra.test', '{"invite_token":"tok-nowa","full_name":"Nowa"}');
select pg_temp.check(exists (select 1 from public.coach_athletes
  where coach_id = '00000000-0000-0000-0000-0000000000c1' and athlete_id = '00000000-0000-0000-0000-0000000000a9'),
  'founders are linked to every new athlete');

-- the last founder cannot be demoted
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  perform public.set_staff_role(auth.uid(), 'running_coach');
  raise exception 'FAIL: last founder demoted';
exception when others then
  if sqlerrm not like '%LAST_FOUNDER%' then raise; end if;
  raise notice 'ok  last founder cannot be demoted';
end $$;

-- ---------------------------------------------------------------- camps and site content
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.camps (id, slug, title, status, capacity, price_pln)
  values ('30000000-0000-0000-0000-000000000001', 'weekend-test', 'VYRA Weekend', 'draft', 12, 5990);
insert into public.articles (slug, title, body, status) values ('szkic', 'Szkic', 'tekst', 'draft');

select pg_temp.as_admin();
set role anon;
select pg_temp.check((select count(*) from public.camps) = 0, 'visitors do not see draft camps');
select pg_temp.check((select count(*) from public.articles) = 0, 'visitors do not see draft articles');
select pg_temp.check((select count(*) from public.site_team) = 3, 'visitors see team cards');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.camps set status = 'published' where slug = 'weekend-test';
update public.articles set status = 'published' where slug = 'szkic';
select pg_temp.check((select published_at is not null from public.articles where slug = 'szkic'), 'publishing sets the date');

select pg_temp.as_admin();
set role anon;
select pg_temp.check((select count(*) from public.camps) = 1, 'visitors see published camps');
insert into public.applications (full_name, email, consent, kind, camp_id)
  values ('Obozowiczka', 'obozowiczka@vyra.test', true, 'camp', '30000000-0000-0000-0000-000000000001');
do $$ begin
  perform count(*) from public.camp_participants;
  raise exception 'FAIL: visitor read participants';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read participants';
end $$;
do $$ begin
  insert into public.camps (slug, title) values ('hack', 'hack');
  raise exception 'FAIL: visitor created a camp';
exception when insufficient_privilege then raise notice 'ok  visitors cannot create camps';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.camp_participants where camp_id = '30000000-0000-0000-0000-000000000001') = 1,
  'a site sign-up lands on the camp participant list');

-- physio records tests but cannot manage camps
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
insert into public.camp_tests (participant_id, phase, vo2max)
  select id, 'start', 48.5 from public.camp_participants where email = 'obozowiczka@vyra.test';
select pg_temp.check((select vo2max from public.camp_tests where phase = 'start') = 48.5, 'staff records camp tests');
do $$ begin
  update public.camps set price_pln = 1 where slug = 'weekend-test';
  if found then raise exception 'FAIL: physio changed a camp'; end if;
  raise notice 'ok  only founders manage camps';
end $$;

-- athletes never see other people's camp data
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.camp_participants) = 0, 'athletes do not see camp participants');
select pg_temp.check((select count(*) from public.camp_tests) = 0, 'athletes do not see camp tests');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.camp_participants set status = 'paid' where email = 'obozowiczka@vyra.test';
select pg_temp.as_admin();
set role anon;
select pg_temp.check((select taken from public.camp_taken_places() limit 1) = 1, 'visitors see how many places are taken');

-- ---------------------------------------------------------------- push and camp participants in the app
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/ala', 'k', 'a');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.push_subscriptions) = 0, 'users see only their own push subscriptions');

-- a fresh notification can be claimed once, by its id
select pg_temp.as_admin();
insert into public.notifications (id, user_id, type, title) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'reminder', 'Jutro: trening');
set role anon;
select pg_temp.check((select count(*) from public.take_push_job('40000000-0000-0000-0000-000000000001')) = 1, 'push job returns the subscriptions');
select pg_temp.check((select count(*) from public.take_push_job('40000000-0000-0000-0000-000000000001')) = 0, 'push job is delivered once');

-- camp participant with an account sees their camp, private info and own tests
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.camp_participants (camp_id, full_name, email, status)
  values ('30000000-0000-0000-0000-000000000001', 'Ala', 'ala@vyra.test', 'paid');
update public.camps set status = 'archived' where id = '30000000-0000-0000-0000-000000000001';
insert into public.camp_private_info (camp_id, body) values ('30000000-0000-0000-0000-000000000001', 'Zbiórka w piątek o 15:00');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.camp_participants) = 1, 'participant is linked to the existing account by e-mail');
select pg_temp.check((select count(*) from public.camps) = 1, 'participant sees their archived camp');
select pg_temp.check((select body from public.camp_private_info) like 'Zbiórka%', 'participant reads information for participants');
select pg_temp.check(exists (select 1 from public.notifications where type = 'camp_info'), 'participants are notified about new information');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.camp_private_info) = 0, 'other athletes do not see participant information');
select pg_temp.as_admin();
set role anon;
select pg_temp.check((select count(*) from public.camps where id = '30000000-0000-0000-0000-000000000001') = 0, 'visitors do not see archived camps');

-- ---------------------------------------------------------------- camp budget (founders only)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.camp_budget_items (camp_id, label, kind, amount_pln)
  values ('30000000-0000-0000-0000-000000000001', 'Nocleg', 'per_person', 1600);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select count(*) from public.camp_budget_items) = 0, 'staff without founder role do not see camp finances');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.camp_budget_items) = 0, 'participants do not see camp finances');

-- ---------------------------------------------------------------- coaching plans
select pg_temp.as_admin();
set role anon;
select pg_temp.check((select count(*) from public.coaching_plans) = 7, 'visitors see published coaching plans (5 coaching + 2 VYRA Method)');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
update public.coaching_plans set price_pln = 1 where name = 'Elite';
select pg_temp.as_admin();
select pg_temp.check((select price_pln from public.coaching_plans where name = 'Elite') = 449, 'non-founder staff cannot change prices');

-- ---------------------------------------------------------------- readiness
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.readiness (athlete_id, day, sleep, energy, soreness, pain, pain_area)
  values ('00000000-0000-0000-0000-0000000000a1', current_date, 4, 3, 2, true, 'kolano');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.readiness) = 1, 'coach sees athlete readiness');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.readiness) = 0, 'foreign coach does not see readiness');
select pg_temp.as_admin();

-- ---------------------------------------------------------------- run club
select pg_temp.as_admin();
insert into public.run_club_events (title, starts_at, place) values ('VYRA Run Club', now() + interval '2 days', 'Park');
set role anon;
insert into public.run_club_signups (event_id, full_name, email) select id, 'Ala', 'ala@x.pl' from public.run_club_events;
select pg_temp.check((select taken from public.run_club_counts()) = 1, 'visitor signs up for run club and sees only the count');
do $$ begin
  perform 1 from public.run_club_signups;
  raise exception 'FAIL: visitors read run club sign-ups';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read run club sign-ups';
end $$;
reset role;

-- ---------------------------------------------------------------- purchase → access → starter week → end
reset role;
do $$ begin
  perform * from public.purchase_access('wrong', 'kup@x.pl', 'Kupiec', 'Start', 'once', 'cs_1', '', 'cus_1', 63);
  raise exception 'FAIL: purchase_access accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  purchase_access rejects a wrong secret';
end $$;
select set_config('vyra.test_secret', (select value from public.app_config where key = 'purchase_secret'), false);
set role anon;
select pg_temp.check(
  (select token is not null and not existing from public.purchase_access(current_setting('vyra.test_secret'), 'kup@x.pl', 'Kupiec Nowy', 'Start', 'once', 'cs_1', '', 'cus_1', 63)),
  'purchase creates an invitation for a new buyer');
select pg_temp.check(
  (select token from public.purchase_access(current_setting('vyra.test_secret'), 'kup@x.pl', 'Kupiec Nowy', 'Start', 'once', 'cs_1', '', 'cus_1', 63))
  = (select token from public.purchase_access(current_setting('vyra.test_secret'), 'KUP@x.pl', 'Kupiec Nowy', 'Start', 'once', 'cs_1', '', 'cus_1', 63)),
  'refreshing the thank-you page reuses the same invitation');
reset role;
select pg_temp.check((select count(*) from public.memberships where email = 'kup@x.pl') = 1, 'one membership per payment');
-- buyer creates the account with the invitation
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000b9', 'kup@x.pl',
       jsonb_build_object('full_name', 'Kupiec Nowy', 'invite_token', (select token from public.invitations where email = 'kup@x.pl'));
select pg_temp.check((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000b9') = 'athlete', 'buyer account is an athlete');
-- starter week
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b9');
select pg_temp.check(public.create_starter_week(jsonb_build_array(
  jsonb_build_object('date', current_date + 1, 'kind', 'running', 'category', 'easy', 'title', 'Spokojny bieg', 'duration_s', 1800, 'zone', 'Z2',
    'segments', jsonb_build_array(jsonb_build_object('type', 'steady', 'label', 'Bieg', 'duration_s', 1800, 'intensity', 'easy'))),
  jsonb_build_object('date', current_date + 2, 'kind', 'strength', 'category', 'strength', 'title', 'Siła A',
    'exercises', jsonb_build_array(jsonb_build_object('name', 'Przysiad', 'sets', jsonb_build_array(jsonb_build_object('reps', 10), jsonb_build_object('reps', 10)))))
)) = 2, 'buyer gets a starter week');
select pg_temp.check(public.create_starter_week('[]'::jsonb) = 0, 'starter week is created only once');
select pg_temp.check((select count(*) from public.training_sessions where athlete_id = auth.uid()) = 2, 'starter sessions belong to the buyer');
select pg_temp.check((select count(*) from public.memberships) = 1, 'buyer sees own membership');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.memberships) = 0, 'other athletes do not see memberships');
select pg_temp.check(public.create_starter_week('[]'::jsonb) = 0, 'no starter week without a purchase');
-- end of access
select pg_temp.as_admin();
update public.memberships set access_until = current_date - 1 where email = 'kup@x.pl';
select public.sync_memberships();
select pg_temp.check((select status from public.coach_athletes where athlete_id = '00000000-0000-0000-0000-0000000000b9' limit 1) = 'archived',
  'athlete is archived when the package runs out');
select pg_temp.check((select status from public.coach_athletes where athlete_id = '00000000-0000-0000-0000-0000000000a1' limit 1) = 'active',
  'athletes without a purchase are never archived');
-- buying again restores access
set role anon;
select public.purchase_access(current_setting('vyra.test_secret'), 'kup@x.pl', 'Kupiec Nowy', 'Performance', 'monthly', 'cs_2', 'sub_2', 'cus_1', null);
reset role;
select pg_temp.check((select status from public.coach_athletes where athlete_id = '00000000-0000-0000-0000-0000000000b9' limit 1) = 'active',
  'a new purchase restores access');
set role anon;
select public.purchase_end(current_setting('vyra.test_secret'), 'sub_2');
reset role;
select pg_temp.check((select status from public.coach_athletes where athlete_id = '00000000-0000-0000-0000-0000000000b9' limit 1) = 'archived',
  'cancelled subscription ends access');

-- ---------------------------------------------------------------- growth: feedback, referrals, vouchers
-- feedback: athletes write their own, founders publish
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.athlete_feedback (athlete_id, rating, quote, consent_publish, display_name) values (auth.uid(), 9, 'Świetny plan', true, 'Ala');
do $$ begin
  insert into public.athlete_feedback (athlete_id, rating) values ('00000000-0000-0000-0000-0000000000a2', 3);
  raise exception 'FAIL: athlete wrote feedback as someone else';
exception when insufficient_privilege then raise notice 'ok  feedback only as yourself';
end $$;
update public.athlete_feedback set status = 'published';
select pg_temp.check((select status from public.athlete_feedback limit 1) = 'new', 'athletes cannot publish their own feedback');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.athlete_feedback) = 0, 'athletes do not see others'' feedback');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check((select count(*) from public.athlete_feedback) = 1, 'founder sees feedback');
select pg_temp.check(exists (select 1 from public.notifications where title like 'Nowa opinia%'), 'founder is notified about feedback');

-- referrals
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select set_config('vyra.ref', public.referral_my_code(), false);
select pg_temp.check(public.referral_my_code() = current_setting('vyra.ref'), 'referral code is stable');
select pg_temp.check(current_setting('vyra.ref') like 'ala-%', 'referral code starts with the first name');
set role anon;
select pg_temp.check((select first_name from public.referral_lookup(current_setting('vyra.ref'))) = 'Ala', 'visitors see the referrer first name');
select pg_temp.check((select count(*) from public.referral_lookup('nope-123')) = 0, 'unknown code gives nothing');
do $$ begin
  perform * from public.referral_record('wrong', current_setting('vyra.ref'), 'cs_r1', 'f@x.pl', 'Start');
  raise exception 'FAIL: referral_record accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  referral_record rejects a wrong secret';
end $$;
select pg_temp.check((select count(*) from public.referral_record(current_setting('vyra.test_secret'), current_setting('vyra.ref'), 'cs_r0', 'ala@vyra.test', 'Start')) = 0,
  'self-referral gives no reward');
select pg_temp.check((select reward from public.referral_record(current_setting('vyra.test_secret'), current_setting('vyra.ref'), 'cs_r1', 'friend@x.pl', 'Start')) = 'manual',
  'referral without own package is rewarded by hand');
select pg_temp.check((select count(*) from public.referral_record(current_setting('vyra.test_secret'), current_setting('vyra.ref'), 'cs_r1', 'friend@x.pl', 'Start')) = 0,
  'one reward per payment');
reset role;
-- a referrer with a one-off package gets 14 more days
insert into public.memberships (email, plan_name, kind, stripe_session, access_until) values ('ala@vyra.test', 'Start', 'once', 'cs_ala', current_date + 10);
set role anon;
select pg_temp.check((select reward from public.referral_record(current_setting('vyra.test_secret'), current_setting('vyra.ref'), 'cs_r2', 'friend2@x.pl', 'Start')) = 'access',
  'one-off package referrer is rewarded with access');
reset role;
select pg_temp.check((select access_until from public.memberships where stripe_session = 'cs_ala') = current_date + 24, 'access extended by 14 days');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.referrals) = 2, 'referrer sees own referrals');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.referrals) = 0, 'others do not see referrals');
select pg_temp.as_admin();

-- vouchers
set role anon;
do $$ begin
  perform public.voucher_issue('wrong', 'cs_v1', 'Start', 63, 99, 'Mama', 'mama@x.pl', 'Syn', 'Wszystkiego dobrego');
  raise exception 'FAIL: voucher_issue accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  voucher_issue rejects a wrong secret';
end $$;
select set_config('vyra.voucher', public.voucher_issue(current_setting('vyra.test_secret'), 'cs_v1', 'Start', 63, 99, 'Mama', 'mama@x.pl', 'Syn', 'Wszystkiego dobrego'), false);
select pg_temp.check(current_setting('vyra.voucher') ~ '^VYRA-[A-Z0-9]{4}-[A-Z0-9]{4}$', 'voucher code format');
select pg_temp.check(public.voucher_issue(current_setting('vyra.test_secret'), 'cs_v1', 'Start', 63, 99, 'Mama', 'mama@x.pl', 'Syn', '') = current_setting('vyra.voucher'),
  'one voucher per payment');
select pg_temp.check((select status from public.voucher_info(lower(current_setting('vyra.voucher')))) = 'active', 'voucher info works with any letter case');
do $$ begin
  perform * from public.vouchers;
  raise exception 'FAIL: visitors read vouchers';
exception when insufficient_privilege then raise notice 'ok  visitors cannot list vouchers';
end $$;
select pg_temp.check((select token is not null from public.voucher_redeem(current_setting('vyra.test_secret'), current_setting('vyra.voucher'), 'syn@x.pl', 'Syn')),
  'voucher redeem gives an account invitation');
select pg_temp.check((select token is not null from public.voucher_redeem(current_setting('vyra.test_secret'), current_setting('vyra.voucher'), 'syn@x.pl', 'Syn')),
  'redeeming again with the same e-mail is safe');
do $$ begin
  perform * from public.voucher_redeem(current_setting('vyra.test_secret'), current_setting('vyra.voucher'), 'inny@x.pl', 'Inny');
  raise exception 'FAIL: voucher redeemed twice';
exception when others then
  if sqlerrm not like '%VOUCHER_USED%' then raise; end if;
  raise notice 'ok  a voucher works once';
end $$;
reset role;
select pg_temp.check((select access_until from public.memberships where stripe_session = 'voucher:' || current_setting('vyra.voucher')) = current_date + 63,
  'voucher gives the package access');
select pg_temp.check((select status from public.voucher_info(current_setting('vyra.voucher'))) = 'redeemed', 'voucher marked as redeemed');

-- ---------------------------------------------------------------- automatic e-mails
set role anon;
select pg_temp.check(public.mail_once(current_setting('vyra.test_secret'), 'test:1') = true, 'first e-mail with a key is sent');
select pg_temp.check(public.mail_once(current_setting('vyra.test_secret'), 'test:1') = false, 'the same e-mail is never sent twice');
select public.mail_unmark(current_setting('vyra.test_secret'), 'test:1');
select pg_temp.check(public.mail_once(current_setting('vyra.test_secret'), 'test:1') = true, 'a failed e-mail can be retried');
do $$ begin
  perform public.mail_once('wrong', 'test:2');
  raise exception 'FAIL: mail_once accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  mail_once rejects a wrong secret';
end $$;
do $$ begin
  perform * from public.mail_log;
  raise exception 'FAIL: visitors read the mail log';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read the mail log';
end $$;
reset role;
insert into public.run_club_events (id, title, starts_at, place) values
  ('00000000-0000-0000-0000-00000000e001', 'Jutro', ((now() at time zone 'Europe/Warsaw')::date + 1 + time '18:00') at time zone 'Europe/Warsaw', 'Park'),
  ('00000000-0000-0000-0000-00000000e002', 'Za tydzień', now() + interval '7 days', 'Park');
insert into public.run_club_signups (event_id, full_name, email) values
  ('00000000-0000-0000-0000-00000000e001', 'Jan', 'jan@x.pl'),
  ('00000000-0000-0000-0000-00000000e002', 'Ola', 'ola@x.pl');
set role anon;
select pg_temp.check((select count(*) from public.run_club_reminders(current_setting('vyra.test_secret')) where email in ('jan@x.pl', 'ola@x.pl')) = 1
  and exists (select 1 from public.run_club_reminders(current_setting('vyra.test_secret')) where email = 'jan@x.pl'),
  'reminders only for tomorrow''s Run Club');
reset role;

-- ---------------------------------------------------------------- run club: counter, notify list, gallery
reset role;
update public.run_club_events set attendees = 0, distance_km = null;
insert into public.run_club_events (title, starts_at, place, attendees, distance_km) values
  ('Było', now() - interval '3 days', 'Park', 6, 5),
  ('Też było', now() - interval '10 days', 'Park', 4, 6.5);
set role anon;
select pg_temp.check((select km from public.run_club_stats()) = 56 and (select people from public.run_club_stats()) = 10
  and (select sessions from public.run_club_stats()) = 2, 'run club counter adds up people and kilometres');
select public.run_club_subscribe('Nowy@X.pl');
select public.run_club_subscribe('nowy@x.pl');
do $$ begin
  perform * from public.run_club_subscribers;
  raise exception 'FAIL: visitors read the notify list';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read the notify list';
end $$;
do $$ begin
  perform * from public.run_club_subscriber_list('wrong');
  raise exception 'FAIL: subscriber list accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  subscriber list rejects a wrong secret';
end $$;
select pg_temp.check((select count(*) from public.run_club_subscriber_list(current_setting('vyra.test_secret')) where email = 'nowy@x.pl') = 1, 'one address on the notify list once');
select pg_temp.check(public.run_club_unsubscribe(gen_random_uuid()) = false, 'a wrong token removes nobody');
select pg_temp.check(public.run_club_unsubscribe((select token from public.run_club_subscriber_list(current_setting('vyra.test_secret')) where email = 'nowy@x.pl')) = true, 'the unsubscribe link works');
do $$ begin
  insert into public.run_club_photos (url) values ('https://x/y.jpg');
  raise exception 'FAIL: visitors add gallery photos';
exception when insufficient_privilege then raise notice 'ok  visitors cannot add gallery photos';
end $$;
reset role;

-- ---------------------------------------------------------------- challenges: open to everyone, rankings, private log link
reset role;
insert into public.challenges (id, slug, title, kind, goal, starts_on, ends_on, visible) values
  ('c0000000-0000-0000-0000-000000000001', 'test-styczen', 'Test', 'km', 100, current_date - 5, current_date + 20, true),
  ('c0000000-0000-0000-0000-000000000002', 'ukryte', 'Ukryte', 'km', 100, current_date - 5, current_date + 20, false);
set role anon;
select pg_temp.check((select count(*) from public.challenges) = 1, 'visitors see only visible challenges');
create temp table if not exists t_join as select * from public.challenge_join('c0000000-0000-0000-0000-000000000001', 'Ala@X.pl', 'Ala', 'Biegam bo lubię');
select pg_temp.check((select is_new and token is not null from t_join), 'joining gives a private link');
select pg_temp.check((select token is null and not is_new from public.challenge_join('c0000000-0000-0000-0000-000000000001', 'ala@x.pl', 'Ktoś', 'Inny')), 'joining again with the same e-mail does not reveal the link');
do $$ begin
  perform public.challenge_join('c0000000-0000-0000-0000-000000000002', 'b@x.pl', 'Bob', null);
  raise exception 'FAIL: joined a hidden challenge';
exception when invalid_parameter_value then raise notice 'ok  hidden challenges cannot be joined';
end $$;
select public.challenge_join('c0000000-0000-0000-0000-000000000001', 'ola@x.pl', 'Ola', 'biegam bo lubię');
select public.challenge_log((select token from t_join), current_date - 1, 10);
select public.challenge_log((select token from t_join), current_date, 5.5);
do $$ begin
  perform public.challenge_log((select token from t_join), current_date + 1, 5);
  raise exception 'FAIL: logged a run in the future';
exception when invalid_parameter_value then raise notice 'ok  no runs in the future';
end $$;
do $$ begin
  perform public.challenge_log(gen_random_uuid(), current_date, 5);
  raise exception 'FAIL: logged with a made-up link';
exception when invalid_parameter_value then raise notice 'ok  a made-up link logs nothing';
end $$;
select pg_temp.check((select km from public.challenge_board('c0000000-0000-0000-0000-000000000001') where name = 'Ala') = 15.5, 'ranking adds up km');
select pg_temp.check((select people from public.challenge_clubs('c0000000-0000-0000-0000-000000000001')) = 2, 'one club in any letter case');
select pg_temp.check((select (public.challenge_me((select token from t_join))->>'member_no') is not null), 'the private page shows the VYRA number');
do $$ begin
  perform * from public.challenge_participants;
  raise exception 'FAIL: visitors read participants';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read participants or e-mails';
end $$;
do $$ begin
  perform * from public.vyra_members;
  raise exception 'FAIL: visitors read members';
exception when insufficient_privilege then raise notice 'ok  visitors cannot read VYRA members';
end $$;
reset role;

-- ---------------------------------------------------------------- VYRA Club: membership, members' page, newsletter switch
reset role;
insert into public.member_posts (kind, title, body) values ('plan', 'Plan listopada', 'Trzy biegi w tygodniu');
set role anon;
create temp table if not exists t_club as select * from public.club_join('nowa@x.pl', 'Ewa', true, 'test');
select pg_temp.check((select is_new and token is not null from t_club), 'joining the club gives a private link');
select pg_temp.check((select token is null from public.club_join('nowa@x.pl', 'Ktoś', false, 'test')), 'joining again does not reveal the link');
select pg_temp.check((select is_new from public.club_join('ala@x.pl', 'Ala', false, 'test')), 'a challenge participant can join the club once');
select pg_temp.check((public.member_area((select token from t_club))->'posts'->0->>'title') = 'Plan listopada', 'members see member posts');
select pg_temp.check(public.member_area(gen_random_uuid()) is null, 'a made-up link shows nothing');
select pg_temp.check(public.member_newsletter((select token from t_club), false) = false, 'newsletter can be switched off from the link');
do $$ begin
  perform * from public.member_posts;
  raise exception 'FAIL: visitors read member posts';
exception when insufficient_privilege then raise notice 'ok  member posts are only behind the link';
end $$;
select pg_temp.check(public.club_count() >= 2, 'club count is public');
reset role;

-- ---------------------------------------------------------------- challenges: verification and finisher code
reset role;
update public.challenges set finisher_code = 'STANDARD15', goal = 20 where id = 'c0000000-0000-0000-0000-000000000001';
set role anon;
do $$ begin
  perform public.challenge_log((select token from t_join), current_date - 2, 5, 600, null);
  raise exception 'FAIL: 2:00 min/km accepted';
exception when invalid_parameter_value then raise notice 'ok  impossible pace is refused';
end $$;
select pg_temp.check((select status from public.challenge_log((select token from t_join), current_date - 2, 6, 1200, null)) = 'pending', 'a very fast run waits for a check');
select pg_temp.check((public.challenge_me((select token from t_join))->>'finisher_code') = 'STANDARD15', 'the finisher code appears once the goal is reached');
do $$ begin
  perform public.challenge_verify('wrong', gen_random_uuid(), 'verified', null);
  raise exception 'FAIL: verification without the secret';
exception when insufficient_privilege then raise notice 'ok  only the server can mark runs verified';
end $$;
do $$ begin
  perform public.challenge_log((select token from t_join), current_date - 2, 5, 1800, 'someone-else/x.jpg');
  raise exception 'FAIL: proof from another folder accepted';
exception when invalid_parameter_value then raise notice 'ok  proof must be in your own folder';
end $$;
reset role;
update public.challenge_entries set status = 'rejected' where km = 6;
set role anon;
select pg_temp.check((select km from public.challenge_board('c0000000-0000-0000-0000-000000000001') where name = 'Ala') = 15.5, 'rejected runs do not count in the ranking');
select pg_temp.check((public.challenge_me((select token from t_join))->>'finisher_code') is null, 'no finisher code below the goal');
reset role;

-- ---------------------------------------------------------------- VYRA Team
reset role;
insert into public.team_members (name, discipline, visible) values ('Widoczny', 'ulica', true), ('Ukryty', 'ultra', false);
set role anon;
select pg_temp.check((select count(*) from public.team_members) = 1, 'visitors see only visible team members');
select public.team_apply('Jan', 'jan@x.pl', 'ultra', 'Lublin', '50 km 4:30', null, null);
do $$ begin
  perform * from public.team_applications;
  raise exception 'FAIL: visitors read applications';
exception when insufficient_privilege then raise notice 'ok  applications are private';
end $$;
do $$ begin
  insert into public.team_members (name) values ('Hacker');
  raise exception 'FAIL: visitors add team members';
exception when insufficient_privilege then raise notice 'ok  visitors cannot change the team';
end $$;
reset role;

-- ---------------------------------------------------------------- Instagram token
set role anon;
do $$ begin
  perform * from public.integration_tokens;
  raise exception 'FAIL: visitors read tokens';
exception when insufficient_privilege then raise notice 'ok  integration tokens are private';
end $$;
do $$ begin
  perform * from public.integration_token_get('wrong', 'instagram');
  raise exception 'FAIL: token read with a wrong secret';
exception when insufficient_privilege then raise notice 'ok  token needs the server secret';
end $$;
select public.integration_token_set(current_setting('vyra.test_secret'), 'instagram', 'abc');
select pg_temp.check((select value from public.integration_token_get(current_setting('vyra.test_secret'), 'instagram')) = 'abc', 'the server can store and read the token');
reset role;

-- ---------------------------------------------------------------- coach assistant
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.coach_insights (athlete_id, created_by, content)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '{"summary":"ok"}');
select pg_temp.check((select count(*) from public.coach_insights) = 1, 'coach stores and reads an analysis of own athlete');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.coach_insights) = 0, 'athlete does not see the coach analysis');
do $$ begin
  insert into public.coach_insights (athlete_id, created_by, content)
    values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '{}');
  raise exception 'FAIL: athlete wrote an analysis';
exception when insufficient_privilege then raise notice 'ok  athlete cannot write an analysis';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.coach_insights) = 0, 'foreign coach does not see the analysis');
do $$ begin
  insert into public.coach_insights (athlete_id, created_by, content)
    values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c2', '{}');
  raise exception 'FAIL: foreign coach wrote an analysis';
exception when insufficient_privilege then raise notice 'ok  foreign coach cannot write an analysis';
end $$;
select pg_temp.as_admin();

-- ---------------------------------------------------------------- main race and coach method
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.coach_methods (coach_id, body) values ('00000000-0000-0000-0000-0000000000c1', '2 akcenty progowe');
select pg_temp.check((select body from public.coach_methods where coach_id = auth.uid()) = '2 akcenty progowe', 'coach saves own method');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.coach_methods) = 0, 'athlete does not see coach methods');
do $$ begin
  insert into public.coach_methods (coach_id, body) values ('00000000-0000-0000-0000-0000000000a1', 'x');
  raise exception 'FAIL: athlete saved a method';
exception when insufficient_privilege then raise notice 'ok  athlete cannot save a method';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  update public.coach_methods set body = 'hack' where coach_id = '00000000-0000-0000-0000-0000000000c1';
end $$;
select pg_temp.as_admin();
select pg_temp.check((select body from public.coach_methods where coach_id = '00000000-0000-0000-0000-0000000000c1') = '2 akcenty progowe', 'another coach cannot change the method');
insert into public.athlete_goals (athlete_id, name, is_main) values ('00000000-0000-0000-0000-0000000000a1', 'Półmaraton', true);
do $$ begin
  insert into public.athlete_goals (athlete_id, name, is_main) values ('00000000-0000-0000-0000-0000000000a1', 'Drugi start A', true);
  raise exception 'FAIL: two main races';
exception when unique_violation then raise notice 'ok  only one main race per athlete';
end $$;

-- ---------------------------------------------------------------- injury history
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.athlete_injuries (athlete_id, area, name, status, restrictions)
  values ('00000000-0000-0000-0000-0000000000a1', 'pieta_achilles', 'Tendinopatia Achillesa', 'recurring', 'bez podbiegów');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.athlete_injuries) = 1, 'athlete sees own injury history');
insert into public.athlete_injuries (athlete_id, area, name) values ('00000000-0000-0000-0000-0000000000a1', 'kolano', 'Ból kolana');
select pg_temp.check((select count(*) from public.athlete_injuries) = 2, 'athlete adds an injury');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.athlete_injuries) = 0, 'another athlete does not see the injuries');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.athlete_injuries) = 0, 'foreign coach does not see the injuries');
do $$ begin
  insert into public.athlete_injuries (athlete_id, area, name) values ('00000000-0000-0000-0000-0000000000a1', 'kolano', 'x');
  raise exception 'FAIL: foreign coach added an injury';
exception when insufficient_privilege then raise notice 'ok  foreign coach cannot add an injury';
end $$;
select pg_temp.as_admin();

-- ---------------------------------------------------------------- assistant learns from the coach
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.coach_methods set body = repeat('x', 15000) where coach_id = auth.uid();
select pg_temp.check((select char_length(body) from public.coach_methods where coach_id = auth.uid()) = 15000, 'a full-length method fits');
insert into public.assistant_feedback (coach_id, athlete_id, verdict, note, general)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'bad', 'próg za szybko', true);
select pg_temp.check((select count(*) from public.assistant_feedback) = 1, 'coach saves a lesson');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select count(*) from public.assistant_feedback) = 0, 'athlete does not see lessons');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select count(*) from public.assistant_feedback) = 0, 'other coach does not see lessons');
do $$ begin
  insert into public.assistant_feedback (coach_id, athlete_id, verdict) values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'good');
  raise exception 'FAIL: lesson about a foreign athlete';
exception when insufficient_privilege then raise notice 'ok  no lessons about foreign athletes';
end $$;
select pg_temp.as_admin();

-- ---------------------------------------------------------------- free plan progress survives the browser
select set_config('vyra.fp', (select token::text from public.free_plan_start(current_setting('vyra.test_secret'), ' Ola@Example.com ', 'Ola') where is_new), false);
select pg_temp.check(current_setting('vyra.fp') <> '', 'new e-mail gets a plan token');
select pg_temp.check((select not is_new from public.free_plan_start(current_setting('vyra.test_secret'), 'ola@example.com', 'Ola')), 'same e-mail is recognised, not duplicated');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set local role anon;
select pg_temp.check(public.free_plan_save(current_setting('vyra.fp')::uuid, '{"1-0": true, "1-1": false, "evil": true}'::jsonb), 'token holder saves progress');
select pg_temp.check((select done from public.free_plan_get(current_setting('vyra.fp')::uuid)) = '{"1-0": true}'::jsonb, 'only valid finished sessions are kept');
select pg_temp.check(not public.free_plan_save(gen_random_uuid(), '{"1-0": true}'::jsonb), 'unknown token saves nothing');
select pg_temp.check((select count(*) from public.free_plan_get(gen_random_uuid())) = 0, 'unknown token reads nothing');
do $$ begin
  perform 1 from public.free_plan_progress;
  raise exception 'FAIL: anon reads the free plan table';
exception when insufficient_privilege then raise notice 'ok  free plan table is closed to direct reads';
end $$;
do $$ begin
  perform public.free_plan_start('wrong', 'x@example.com', 'X');
  raise exception 'FAIL: free_plan_start accepts a wrong secret';
exception when insufficient_privilege then raise notice 'ok  free_plan_start rejects a wrong secret';
end $$;
reset role;
select pg_temp.as_admin();
