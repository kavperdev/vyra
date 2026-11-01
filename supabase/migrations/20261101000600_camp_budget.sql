-- VYRA · camp budget for founders (costs, price, surplus, break-even)

create table public.camp_budget (
  camp_id               uuid primary key references public.camps (id) on delete cascade,
  planned_participants  int not null default 12 check (planned_participants between 1 and 500),
  reserve_pct           numeric(4,1) not null default 10 check (reserve_pct between 0 and 100),
  founders              int not null default 2 check (founders between 1 and 10),
  updated_at            timestamptz not null default now()
);
create trigger camp_budget_updated before update on public.camp_budget
  for each row execute function public.set_updated_at();

create table public.camp_budget_items (
  id          uuid primary key default gen_random_uuid(),
  camp_id     uuid not null references public.camps (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 160),
  kind        text not null check (kind in ('per_person', 'fixed')),
  amount_pln  numeric(10,2) not null check (amount_pln between 0 and 10000000),
  note        text check (char_length(note) <= 300),
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index camp_budget_items_camp_idx on public.camp_budget_items (camp_id, sort);

alter table public.camp_budget enable row level security;
alter table public.camp_budget_items enable row level security;
create policy camp_budget_founders on public.camp_budget for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
create policy camp_budget_items_founders on public.camp_budget_items for all to authenticated
  using (public.is_founder()) with check (public.is_founder());
grant select, insert, update, delete on public.camp_budget, public.camp_budget_items to authenticated;
