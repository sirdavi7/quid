create extension if not exists pgcrypto;

create table if not exists public.quid_wallet_activity (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.quid_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_username text not null,
  wallet_address text not null,
  from_address text,
  to_address text not null,
  amount numeric(18, 6) not null,
  asset text not null default 'USDC',
  chain text not null default 'Arc Testnet',
  tx_hash text not null,
  explorer_url text not null,
  source text not null default 'Direct deposit',
  block_number numeric(30, 0),
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint quid_wallet_activity_amount_positive check (amount > 0),
  constraint quid_wallet_activity_tx_hash_unique unique (tx_hash)
);

create index if not exists quid_wallet_activity_owner_happened_at_idx on public.quid_wallet_activity(owner_id, happened_at desc);
create index if not exists quid_wallet_activity_page_id_idx on public.quid_wallet_activity(page_id);
create index if not exists quid_wallet_activity_wallet_address_idx on public.quid_wallet_activity(wallet_address);

alter table public.quid_wallet_activity enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.quid_wallet_activity to authenticated;

drop policy if exists "Users can read wallet activity for their Quid pages" on public.quid_wallet_activity;

create policy "Users can read wallet activity for their Quid pages"
on public.quid_wallet_activity
for select
to authenticated
using (auth.uid() = owner_id);
