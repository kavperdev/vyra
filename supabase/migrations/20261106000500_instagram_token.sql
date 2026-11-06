-- VYRA · Instagram feed on the website: the long-lived token, refreshed by the daily job.
-- Nobody can read it from outside; only the server (with the shared secret). Safe to run more than once.

create table if not exists public.integration_tokens (
  name       text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.integration_tokens enable row level security;
revoke all on public.integration_tokens from anon, authenticated;

create or replace function public.integration_token_get(p_secret text, p_name text)
returns table (value text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select c.value from public.app_config c where c.key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  return query select t.value, t.updated_at from public.integration_tokens t where t.name = p_name;
end $$;
revoke execute on function public.integration_token_get(text, text) from public;
grant execute on function public.integration_token_get(text, text) to anon, authenticated;

create or replace function public.integration_token_set(p_secret text, p_name text, p_value text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select c.value from public.app_config c where c.key = 'purchase_secret') then
    raise exception 'PURCHASE_FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.integration_tokens (name, value, updated_at) values (p_name, p_value, now())
  on conflict (name) do update set value = excluded.value, updated_at = now();
end $$;
revoke execute on function public.integration_token_set(text, text, text) from public;
grant execute on function public.integration_token_set(text, text, text) to anon, authenticated;
