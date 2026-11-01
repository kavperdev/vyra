-- VYRA · applications now come from two forms on the brand home page:
--   'camp'     → "Zapisz się na listę" (camp waitlist: name + e-mail)
--   'coaching' → "Zapytaj o prowadzenie" (individual coaching)

alter table public.applications
  add column if not exists kind text not null default 'coaching'
  check (kind in ('coaching', 'camp'));

create index if not exists applications_kind_idx on public.applications (kind, created_at desc);
