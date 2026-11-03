-- VYRA · Automatic e-mails: a log so every e-mail goes out once, and the Run Club reminder list.
-- Safe to run more than once.

create table if not exists public.mail_log (
  key     text primary key check (char_length(key) <= 300),
  sent_at timestamptz not null default now()
);
alter table public.mail_log enable row level security;
revoke all on public.mail_log from anon, authenticated;

-- Server only: true the first time a key is seen (send the e-mail), false afterwards (already sent).
create or replace function public.mail_once(p_secret text, p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.mail_log (key) values (left(p_key, 300)) on conflict do nothing;
  return found;
end $$;
revoke execute on function public.mail_once(text, text) from public;
grant execute on function public.mail_once(text, text) to anon, authenticated;

-- Server only: the send failed, allow a retry later.
create or replace function public.mail_unmark(p_secret text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.mail_log where key = left(p_key, 300);
end $$;
revoke execute on function public.mail_unmark(text, text) from public;
grant execute on function public.mail_unmark(text, text) to anon, authenticated;

-- Server only (daily job): sign-ups for Run Club sessions that start tomorrow (Polish time).
create or replace function public.run_club_reminders(p_secret text)
returns table (event_id uuid, email text, full_name text, title text, starts_at timestamptz, place text, map_url text, pace text)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select e.id, s.email, s.full_name, e.title, e.starts_at, e.place, e.map_url, e.pace
      from public.run_club_events e join public.run_club_signups s on s.event_id = e.id
     where e.visible and (e.starts_at at time zone 'Europe/Warsaw')::date = (now() at time zone 'Europe/Warsaw')::date + 1;
end $$;
revoke execute on function public.run_club_reminders(text) from public;
grant execute on function public.run_club_reminders(text) to anon, authenticated;
