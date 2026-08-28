create extension if not exists pgcrypto;

create table if not exists public.quid_payments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.quid_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_username text not null,
  payer_address text,
  recipient_address text not null,
  amount numeric(18, 6) not null,
  asset text not null default 'USDC',
  source_chain text not null default 'Arc Testnet',
  destination_chain text not null default 'Arc Testnet',
  tx_hash text,
  explorer_url text,
  status text not null default 'submitted',
  kind text not null default 'incoming',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint quid_payments_amount_positive check (amount > 0),
  constraint quid_payments_status_check check (status in ('submitted', 'confirmed', 'failed')),
  constraint quid_payments_kind_check check (kind in ('incoming', 'outgoing'))
);

create index if not exists quid_payments_page_id_idx on public.quid_payments(page_id);
create index if not exists quid_payments_owner_id_created_at_idx on public.quid_payments(owner_id, created_at desc);
create index if not exists quid_payments_page_username_idx on public.quid_payments(page_username);
create index if not exists quid_payments_tx_hash_idx on public.quid_payments(tx_hash) where tx_hash is not null;

alter table public.quid_payments enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.quid_payments to authenticated;

drop policy if exists "Users can read payments for their Quid pages" on public.quid_payments;
drop policy if exists "Users can insert payments for their Quid pages" on public.quid_payments;
drop policy if exists "Users can update payments for their Quid pages" on public.quid_payments;
drop policy if exists "Users can delete payments for their Quid pages" on public.quid_payments;

create policy "Users can read payments for their Quid pages"
on public.quid_payments
for select
to authenticated
using (auth.uid() = owner_id);
