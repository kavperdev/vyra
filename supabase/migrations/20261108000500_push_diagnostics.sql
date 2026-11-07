-- VYRA · Push diagnostics for founders: is pg_net on, where the database sends pushes, what the app answered.
-- And a self-test: a real notification for yourself that travels the whole way (database → app → phone).
-- Safe to run more than once.

do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net not available';
end $$;

create or replace function public.push_diagnose() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
  v_responses jsonb := '[]'::jsonb;
begin
  if not public.is_founder() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  begin
    execute $q$select coalesce(jsonb_agg(jsonb_build_object('status', status_code, 'body', left(content, 200), 'error', left(error_msg, 200), 'at', created) order by created desc), '[]'::jsonb)
               from (select * from net._http_response order by created desc limit 5) r$q$ into v_responses;
  exception when others then
    v_responses := '[]'::jsonb;
  end;
  select jsonb_build_object(
    'pg_net', exists (select 1 from pg_extension where extname = 'pg_net'),
    'endpoint', (select value from app_config where key = 'push_endpoint'),
    'my_devices', (select count(*) from push_subscriptions where user_id = auth.uid()),
    'all_devices', (select count(*) from push_subscriptions),
    'last_pushed', (select max(pushed_at) from notifications),
    'responses', v_responses
  ) into v;
  return v;
end $$;
revoke execute on function public.push_diagnose() from public;
grant execute on function public.push_diagnose() to authenticated;

-- A notification for yourself; the normal trigger sends it as a push. Returns its id to check pushed_at.
create or replace function public.push_selftest() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  insert into notifications (user_id, type, title, body, link)
    values (auth.uid(), 'reminder', 'Test VYRA', 'To powiadomienie przeszło całą drogę: baza → aplikacja → telefon.', '/panel')
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.push_selftest() from public;
grant execute on function public.push_selftest() to authenticated;
