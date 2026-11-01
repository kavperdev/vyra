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
select pg_temp.check((select count(*) from public.profiles) = 1, 'foreign coach sees only own profile');
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
