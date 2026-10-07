-- Apply after supabase/quid_payments.sql.
-- Keeps Quid's user-facing transaction state tied to a real Circle operation
-- or an on-chain receipt instead of treating submission as confirmation.

alter table public.quid_payments
  add column if not exists operation text not null default 'checkout',
  add column if not exists circle_transaction_id text,
  add column if not exists gateway_transfer_id text,
  add column if not exists circle_state text,
  add column if not exists block_number text,
  add column if not exists failure_reason text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists quid_payments_owner_status_created_at_idx
  on public.quid_payments(owner_id, status, created_at desc);

create unique index if not exists quid_payments_owner_circle_transaction_id_idx
  on public.quid_payments(owner_id, circle_transaction_id)
  where circle_transaction_id is not null;

-- Enables browser clients to refresh the dashboard when Quid reconciles a
-- transaction. The existing owner-only select policy continues to gate rows.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quid_payments'
    ) then
    alter publication supabase_realtime add table public.quid_payments;
  end if;
end
$$;
