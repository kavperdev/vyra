-- VYRA · online payments (Stripe Checkout): a paid purchase lands in applications once per payment.
alter table public.applications add column if not exists payment_ref text;
create unique index if not exists applications_payment_ref_key on public.applications (payment_ref) where payment_ref is not null;
