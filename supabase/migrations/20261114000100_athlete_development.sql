-- Athlete development card: fitness test results, plus the parent page shows them with recent attendance.
-- Run after 20261113000100_club_management.sql.

create table if not exists public.fitness_results (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  club_id     uuid references public.sport_clubs (id) on delete set null,
  test_key    text not null check (test_key in ('sprint_30', 'sprint_60', 'shuttle_10x5', 'run_600', 'run_1000', 'standing_jump', 'long_jump', 'ball_throw', 'situps_30s', 'cooper')),
  value       numeric(8,2) not null check (value > 0 and value < 100000),
  tested_on   date not null,
  note        text check (char_length(note) <= 300),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (athlete_id, test_key, tested_on)
);
create index if not exists fitness_results_athlete_idx on public.fitness_results (athlete_id, test_key, tested_on);
create index if not exists fitness_results_club_idx on public.fitness_results (club_id, tested_on);
alter table public.fitness_results enable row level security;

-- The club is always the athlete's own club, whatever the client sends.
create or replace function public.fitness_results_club() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select club_id into new.club_id from public.profiles where id = new.athlete_id;
  return new;
end $$;
drop trigger if exists fitness_results_club on public.fitness_results;
create trigger fitness_results_club before insert or update of athlete_id on public.fitness_results
  for each row execute function public.fitness_results_club();

create or replace function public.can_test_athlete(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_coach_of(p_athlete)
      or exists (select 1 from public.profiles p where p.id = p_athlete and p.club_id is not null and public.is_club_staff(p.club_id))
$$;
revoke execute on function public.can_test_athlete(uuid) from public, anon;
grant execute on function public.can_test_athlete(uuid) to authenticated;

drop policy if exists fitness_results_select on public.fitness_results;
create policy fitness_results_select on public.fitness_results for select to authenticated
  using (athlete_id = auth.uid() or public.can_test_athlete(athlete_id));
drop policy if exists fitness_results_insert on public.fitness_results;
create policy fitness_results_insert on public.fitness_results for insert to authenticated
  with check (public.can_test_athlete(athlete_id));
drop policy if exists fitness_results_update on public.fitness_results;
create policy fitness_results_update on public.fitness_results for update to authenticated
  using (public.can_test_athlete(athlete_id)) with check (public.can_test_athlete(athlete_id));
drop policy if exists fitness_results_delete on public.fitness_results;
create policy fitness_results_delete on public.fitness_results for delete to authenticated
  using (public.can_test_athlete(athlete_id));
grant select, insert, update, delete on public.fitness_results to authenticated;

create or replace function public.get_family_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  g public.athlete_guardians;
  a public.profiles;
  c public.sport_clubs;
begin
  if p_token is null or char_length(p_token) < 24 then return null; end if;
  select * into g from public.athlete_guardians where access_token = p_token;
  if not found then return null; end if;
  select * into a from public.profiles where id = g.athlete_id;
  select * into c from public.sport_clubs where id = a.club_id;
  return jsonb_build_object(
    'guardian', g.full_name,
    'athlete', jsonb_build_object('id', a.id, 'name', a.full_name),
    'club', case when c.id is null then null else jsonb_build_object('name', c.name, 'city', c.city, 'logo_url', c.logo_url,
             'bank_account', c.bank_account, 'bank_recipient', coalesce(c.bank_recipient, c.name)) end,
    'groups', coalesce((select jsonb_agg(jsonb_build_object('id', gr.id, 'name', gr.name, 'color', gr.color,
               'slots', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'weekday', s.weekday, 'start', s.start_time, 'end', s.end_time, 'place', s.place,
                                   'valid_from', s.valid_from, 'valid_to', s.valid_to) order by s.weekday, s.start_time)
                                  from public.club_schedule s where s.group_id = gr.id), '[]'::jsonb)) order by gr.name)
             from public.club_groups gr join public.club_group_members m on m.group_id = gr.id and m.athlete_id = a.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('title', e.title, 'kind', e.kind, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
               'place', e.place, 'cancelled', e.cancelled, 'schedule_id', e.schedule_id, 'occurs_on', e.occurs_on, 'note', e.note) order by e.starts_at)
             from public.club_events e
             where e.club_id = a.club_id and e.starts_at >= now() - interval '1 day' and e.starts_at < now() + interval '45 days'
               and (e.group_id is null or exists (select 1 from public.club_group_members m where m.group_id = e.group_id and m.athlete_id = a.id))), '[]'::jsonb),
    'announcements', coalesce((select jsonb_agg(x order by (x ->> 'created_at') desc) from (
               select jsonb_build_object('title', n.title, 'body', n.body, 'created_at', n.created_at) x
               from public.club_announcements n
               where n.club_id = a.club_id
                 and (n.group_id is null or exists (select 1 from public.club_group_members m where m.group_id = n.group_id and m.athlete_id = a.id))
               order by n.created_at desc limit 10) q), '[]'::jsonb),
    'charges', coalesce((select jsonb_agg(jsonb_build_object('title', f.title, 'amount', f.amount, 'due_date', f.due_date, 'status', f.status,
               'code', f.code, 'paid_at', f.paid_at) order by f.period desc)
             from (select * from public.fee_charges where athlete_id = a.id and status <> 'cancelled' order by period desc limit 8) f), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('title', s.title, 'date', s.scheduled_date, 'time', s.scheduled_time, 'status', s.status)
               order by s.scheduled_date, s.scheduled_time)
             from public.training_sessions s
             where s.athlete_id = a.id and s.scheduled_date between current_date and current_date + 14), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('kind', d.kind, 'valid_until', d.valid_until))
             from public.athlete_documents d where d.athlete_id = a.id), '[]'::jsonb),
    'fitness', coalesce((select jsonb_agg(jsonb_build_object('test', r.test_key, 'value', r.value, 'tested_on', r.tested_on) order by r.tested_on)
             from public.fitness_results r where r.athlete_id = a.id), '[]'::jsonb),
    'attendance', (select jsonb_build_object(
               'present', count(*) filter (where coalesce(sa.present, s.status = 'completed')),
               'marked', count(*) filter (where sa.present is not null or s.status in ('completed', 'skipped')))
             from public.training_sessions s left join public.session_attendance sa on sa.session_id = s.id
             where s.athlete_id = a.id and s.scheduled_date between current_date - 30 and current_date)
  );
end $$;
revoke execute on function public.get_family_view(text) from public;
grant execute on function public.get_family_view(text) to anon, authenticated;
