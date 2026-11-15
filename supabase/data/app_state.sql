-- The app's own data on the account: run log, plans, results, goals, course progress.
-- One row per key; the phone merges and writes back. Only the owner can read or write their rows.

create table if not exists public.app_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (key ~ '^vyra-[a-z0-9-]{1,40}$'),
  value jsonb,
  ts bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint app_state_size check (pg_column_size(value) < 600000)
);

alter table public.app_state enable row level security;

drop policy if exists app_state_own on public.app_state;
create policy app_state_own on public.app_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.app_state to authenticated;
