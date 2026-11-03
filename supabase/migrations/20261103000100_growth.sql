-- VYRA · Growth: athlete feedback (testimonials), referrals, gift vouchers.
-- Safe to run more than once.

-- ================================================================ athlete feedback
create table if not exists public.athlete_feedback (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.profiles (id) on delete cascade,
  rating          int not null check (rating between 1 and 10),
  changed         text check (char_length(changed) <= 1000),
  quote           text check (char_length(quote) <= 600),
  result          text check (char_length(result) <= 120),
  display_name    text check (char_length(display_name) <= 80),
  consent_publish boolean not null default false,
  status          text not null default 'new' check (status in ('new', 'published', 'hidden')),
  testimonial_id  uuid references public.testimonials (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists athlete_feedback_athlete_idx on public.athlete_feedback (athlete_id);
alter table public.athlete_feedback enable row level security;
drop policy if exists athlete_feedback_select on public.athlete_feedback;
drop policy if exists athlete_feedback_insert on public.athlete_feedback;
drop policy if exists athlete_feedback_update on public.athlete_feedback;
create policy athlete_feedback_select on public.athlete_feedback for select to authenticated
  using (athlete_id = auth.uid() or public.is_founder());
create policy athlete_feedback_insert on public.athlete_feedback for insert to authenticated
  with check (athlete_id = auth.uid() and status = 'new' and testimonial_id is null);
create policy athlete_feedback_update on public.athlete_feedback for update to authenticated
  using (public.is_founder()) with check (public.is_founder());
grant select, insert, update on public.athlete_feedback to authenticated;

create or replace function public.notify_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from public.profiles where id = new.athlete_id;
  perform public.notify(public.purchase_founder(), 'reminder', 'Nowa opinia: ' || coalesce(v_name, 'zawodnik') || ' · ' || new.rating || '/10',
    case when new.consent_publish then 'Zgoda na publikację. Opublikuj jednym kliknięciem.' else 'Bez zgody na publikację.' end,
    '/coach/site#opinie', null);
  return new;
end $$;
drop trigger if exists athlete_feedback_notify on public.athlete_feedback;
create trigger athlete_feedback_notify after insert on public.athlete_feedback
  for each row execute function public.notify_feedback();

-- ================================================================ referrals
create table if not exists public.referral_codes (
  athlete_id uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique check (code ~ '^[a-z0-9-]{3,40}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,
  referrer_id    uuid references public.profiles (id) on delete set null,
  buyer_email    text not null,
  stripe_session text not null unique,
  plan_name      text,
  reward         text not null default 'manual' check (reward in ('access', 'credit', 'manual')),
  created_at     timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
drop policy if exists referral_codes_select on public.referral_codes;
drop policy if exists referrals_select on public.referrals;
create policy referral_codes_select on public.referral_codes for select to authenticated
  using (athlete_id = auth.uid() or public.is_founder());
create policy referrals_select on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or public.is_founder());
grant select on public.referral_codes, public.referrals to authenticated;

-- The signed-in athlete's personal referral code, created on first use ("kacper-7k2").
create or replace function public.referral_my_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me   public.profiles;
  v_code text;
  v_base text;
  i      int := 0;
begin
  select * into v_me from public.profiles where id = auth.uid();
  if not found or v_me.role <> 'athlete' then raise exception 'ONLY_ATHLETES' using errcode = '42501'; end if;
  select code into v_code from public.referral_codes where athlete_id = v_me.id;
  if v_code is not null then return v_code; end if;
  v_base := lower(split_part(trim(coalesce(v_me.full_name, 'vyra')), ' ', 1));
  v_base := translate(v_base, 'ąćęłńóśźż', 'acelnoszz');
  v_base := left(nullif(regexp_replace(v_base, '[^a-z0-9]', '', 'g'), ''), 20);
  v_base := coalesce(v_base, 'vyra');
  loop
    i := i + 1;
    v_code := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 3);
    begin
      insert into public.referral_codes (athlete_id, code) values (v_me.id, v_code);
      return v_code;
    exception when unique_violation then
      if i > 20 then raise; end if;
    end;
  end loop;
end $$;
revoke execute on function public.referral_my_code() from public, anon;
grant execute on function public.referral_my_code() to authenticated;

-- Public: whose code is it (first name only), for the referral landing page.
create or replace function public.referral_lookup(p_code text) returns table (first_name text)
language sql stable security definer set search_path = public as $$
  select split_part(trim(p.full_name), ' ', 1)
    from public.referral_codes r join public.profiles p on p.id = r.athlete_id
   where r.code = lower(trim(p_code)) and p.role = 'athlete'
$$;
revoke execute on function public.referral_lookup(text) from public;
grant execute on function public.referral_lookup(text) to anon, authenticated;

-- After a paid purchase with a referral code (server only). Rewards the referrer once per payment:
-- a one-off package gets 14 more days, a subscription returns the Stripe customer for a credit.
create or replace function public.referral_record(p_secret text, p_code text, p_session text, p_email text, p_plan text)
returns table (reward text, referrer_customer text)
language plpgsql security definer set search_path = public as $$
declare
  v_ref   public.profiles;
  v_mem   public.memberships;
  v_rew   text := 'manual';
  v_cus   text;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  select p.* into v_ref from public.referral_codes r join public.profiles p on p.id = r.athlete_id where r.code = lower(trim(p_code));
  if not found or lower(v_ref.email) = lower(trim(p_email)) then return; end if;
  if exists (select 1 from public.referrals where stripe_session = p_session) then return; end if;

  select * into v_mem from public.memberships m
   where lower(m.email) = lower(v_ref.email) and m.status = 'active'
   order by (m.kind = 'monthly') desc, m.created_at desc limit 1;
  if found and v_mem.kind = 'monthly' and v_mem.stripe_customer is not null then
    v_rew := 'credit';
    v_cus := v_mem.stripe_customer;
  elsif found and v_mem.kind = 'once' then
    v_rew := 'access';
    update public.memberships set access_until = greatest(coalesce(access_until, current_date), current_date) + 14 where id = v_mem.id;
  end if;

  insert into public.referrals (code, referrer_id, buyer_email, stripe_session, plan_name, reward)
  values (lower(trim(p_code)), v_ref.id, lower(trim(p_email)), p_session, left(p_plan, 120), v_rew);

  perform public.notify(v_ref.id, 'reminder', 'Dziękujemy za polecenie!',
    case v_rew when 'access' then 'Ktoś dołączył z Twojego linku. Dodaliśmy Ci 14 dni dostępu.'
               when 'credit' then 'Ktoś dołączył z Twojego linku. Następna płatność będzie niższa.'
               else 'Ktoś dołączył z Twojego linku. Trener odezwie się w sprawie nagrody.' end,
    '/athlete/polecaj', null);
  perform public.notify(public.purchase_founder(), 'reminder', 'Polecenie: ' || coalesce(v_ref.full_name, v_ref.email),
    coalesce(p_plan, 'pakiet') || ' · nagroda: ' || case v_rew when 'access' then '+14 dni' when 'credit' then 'kredyt w Stripe' else 'do przyznania ręcznie' end,
    '/coach/growth', null);
  return query select v_rew, v_cus;
end $$;
revoke execute on function public.referral_record(text, text, text, text, text) from public;
grant execute on function public.referral_record(text, text, text, text, text) to anon, authenticated;

-- ================================================================ gift vouchers
create table if not exists public.vouchers (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  plan_name      text not null,
  days           int not null check (days between 1 and 400),
  amount_pln     int,
  buyer_name     text,
  buyer_email    text,
  recipient_name text,
  message        text check (char_length(message) <= 300),
  stripe_session text unique,
  status         text not null default 'active' check (status in ('active', 'redeemed', 'void')),
  valid_until    date not null,
  redeemed_email text,
  redeemed_at    timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.vouchers enable row level security;
drop policy if exists vouchers_founders on public.vouchers;
create policy vouchers_founders on public.vouchers for all to authenticated using (public.is_founder()) with check (public.is_founder());
grant select, update on public.vouchers to authenticated;

-- After a paid voucher purchase (server only). Returns the voucher code; repeated calls return the same code.
create or replace function public.voucher_issue(
  p_secret text, p_session text, p_plan text, p_days int, p_amount int,
  p_buyer_name text, p_buyer_email text, p_recipient text, p_message text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  i int := 0;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  select code into v_code from public.vouchers where stripe_session = p_session;
  if v_code is not null then return v_code; end if;
  loop
    i := i + 1;
    v_code := 'VYRA-' || upper(translate(substr(md5(random()::text || clock_timestamp()::text), 1, 4), '01', 'XY'))
                || '-' || upper(translate(substr(md5(random()::text || clock_timestamp()::text), 5, 4), '01', 'ZW'));
    begin
      insert into public.vouchers (code, plan_name, days, amount_pln, buyer_name, buyer_email, recipient_name, message, stripe_session, valid_until)
      values (v_code, left(coalesce(p_plan, 'Pakiet'), 120), greatest(1, least(coalesce(p_days, 35), 400)), p_amount,
              left(nullif(trim(p_buyer_name), ''), 120), lower(nullif(trim(p_buyer_email), '')),
              left(nullif(trim(p_recipient), ''), 120), left(nullif(trim(p_message), ''), 300), p_session, current_date + 365);
      exit;
    exception when unique_violation then
      if i > 20 then raise; end if;
    end;
  end loop;
  perform public.notify(public.purchase_founder(), 'reminder', 'Sprzedany voucher: ' || coalesce(p_plan, 'pakiet'),
    coalesce(nullif(trim(p_buyer_name), ''), 'Kupujący') || ' → ' || coalesce(nullif(trim(p_recipient), ''), 'obdarowany') || ' · ' || v_code, '/coach/growth', null);
  return v_code;
end $$;
revoke execute on function public.voucher_issue(text, text, text, int, int, text, text, text, text) from public;
grant execute on function public.voucher_issue(text, text, text, int, int, text, text, text, text) to anon, authenticated;

-- Public: what a voucher code is for (shown on the printable voucher and the redeem page).
create or replace function public.voucher_info(p_code text)
returns table (code text, plan_name text, recipient_name text, buyer_name text, message text, status text, valid_until date)
language sql stable security definer set search_path = public as $$
  select v.code, v.plan_name, v.recipient_name, v.buyer_name, v.message,
         case when v.status = 'active' and v.valid_until < current_date then 'expired' else v.status end, v.valid_until
    from public.vouchers v where v.code = upper(trim(p_code))
$$;
revoke execute on function public.voucher_info(text) from public;
grant execute on function public.voucher_info(text) to anon, authenticated;

-- Redeem (server only): the recipient gets the package and an account invitation, like a buyer.
create or replace function public.voucher_redeem(p_secret text, p_code text, p_email text, p_name text)
returns table (token text, existing boolean, plan_name text)
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers;
  r record;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  select * into v from public.vouchers where vouchers.code = upper(trim(p_code)) for update;
  if not found or v.status = 'void' then raise exception 'VOUCHER_NOT_FOUND' using errcode = 'P0002'; end if;
  if v.status = 'redeemed' and lower(coalesce(v.redeemed_email, '')) <> lower(trim(p_email)) then
    raise exception 'VOUCHER_USED' using errcode = 'P0001';
  end if;
  if v.status = 'active' and v.valid_until < current_date then raise exception 'VOUCHER_EXPIRED' using errcode = 'P0001'; end if;
  if v.status = 'active' then
    update public.vouchers set status = 'redeemed', redeemed_email = lower(trim(p_email)), redeemed_at = now() where id = v.id;
  end if;
  select * into r from public.purchase_access(p_secret, p_email, p_name, v.plan_name, 'once', 'voucher:' || v.code, '', '', v.days);
  return query select r.token, r.existing, v.plan_name;
end $$;
revoke execute on function public.voucher_redeem(text, text, text, text) from public;
grant execute on function public.voucher_redeem(text, text, text, text) to anon, authenticated;
