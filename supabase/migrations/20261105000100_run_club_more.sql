-- VYRA · Run Club: meeting point, attendance and kilometres, "notify me" list, photo gallery.
-- Safe to run more than once.

-- 1. Per event: where exactly to meet, and after the session how many came and how far they ran.
alter table public.run_club_events add column if not exists meeting_note text check (char_length(meeting_note) <= 300);
alter table public.run_club_events add column if not exists attendees int check (attendees between 0 and 999);
alter table public.run_club_events add column if not exists distance_km numeric(5,1) check (distance_km between 0 and 100);

-- Public totals for the counter: sessions held, people who came (sum over sessions), kilometres run together.
create or replace function public.run_club_stats()
returns table (sessions int, people int, km numeric)
language sql stable security definer set search_path = public as $$
  select count(*)::int,
         coalesce(sum(attendees), 0)::int,
         coalesce(round(sum(attendees * coalesce(distance_km, 0)))::numeric, 0)
    from public.run_club_events
   where attendees > 0 and starts_at < now();
$$;
revoke execute on function public.run_club_stats() from public;
grant execute on function public.run_club_stats() to anon, authenticated;

-- 2. "Let me know about new dates": e-mail list with a private unsubscribe token.
create table if not exists public.run_club_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique check (char_length(email) between 5 and 254),
  token      uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.run_club_subscribers enable row level security;
revoke all on public.run_club_subscribers from anon, authenticated;
grant select, delete on public.run_club_subscribers to authenticated;
drop policy if exists run_club_subscribers_founder on public.run_club_subscribers;
create policy run_club_subscribers_founder on public.run_club_subscribers for all to authenticated using (public.is_founder()) with check (public.is_founder());

-- Anyone may join the list (the e-mail is never readable back).
create or replace function public.run_club_subscribe(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(p_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  insert into public.run_club_subscribers (email) values (lower(trim(p_email))) on conflict (email) do nothing;
end $$;
revoke execute on function public.run_club_subscribe(text) from public;
grant execute on function public.run_club_subscribe(text) to anon, authenticated;

-- The link in every e-mail removes the address; true when something was removed.
create or replace function public.run_club_unsubscribe(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.run_club_subscribers where token = p_token;
  return found;
end $$;
revoke execute on function public.run_club_unsubscribe(uuid) from public;
grant execute on function public.run_club_unsubscribe(uuid) to anon, authenticated;

-- Server only: the list with tokens, to send "new date" e-mails.
create or replace function public.run_club_subscriber_list(p_secret text)
returns table (email text, token uuid)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  return query select s.email, s.token from public.run_club_subscribers s order by s.created_at;
end $$;
revoke execute on function public.run_club_subscriber_list(text) from public;
grant execute on function public.run_club_subscriber_list(text) to anon, authenticated;

-- 3. Gallery: photos from the sessions (files live in the public "site-photos" bucket, folder run-club/).
create table if not exists public.run_club_photos (
  id         uuid primary key default gen_random_uuid(),
  url        text not null check (char_length(url) <= 500),
  caption    text check (char_length(caption) <= 160),
  sort       int not null default 0,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.run_club_photos enable row level security;
grant select on public.run_club_photos to anon, authenticated;
grant insert, update, delete on public.run_club_photos to authenticated;
drop policy if exists run_club_photos_read on public.run_club_photos;
create policy run_club_photos_read on public.run_club_photos for select to anon, authenticated using (visible or public.is_founder());
drop policy if exists run_club_photos_write on public.run_club_photos;
create policy run_club_photos_write on public.run_club_photos for all to authenticated using (public.is_founder()) with check (public.is_founder());
