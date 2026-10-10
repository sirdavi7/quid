-- Apply after supabase/quid_payments_lifecycle.sql.
-- Keeps exact chain-receipt fee evidence separate from Gateway route quotes.

alter table public.quid_payments
  add column if not exists fee_evidence jsonb not null default '[]'::jsonb;
