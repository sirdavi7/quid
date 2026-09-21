create table if not exists public.quid_gateway_wallets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.quid_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_username text not null,
  wallet_id text not null,
  wallet_address text not null,
  wallet_blockchain text not null default 'EVM-TESTNET',
  wallet_account_type text not null default 'EOA',
  mocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quid_gateway_wallets_page_unique unique (page_id)
);

create index if not exists quid_gateway_wallets_owner_id_idx on public.quid_gateway_wallets(owner_id);

drop trigger if exists quid_gateway_wallets_set_updated_at on public.quid_gateway_wallets;
create trigger quid_gateway_wallets_set_updated_at
before update on public.quid_gateway_wallets
for each row execute function public.set_updated_at();

alter table public.quid_gateway_wallets enable row level security;

grant select on public.quid_gateway_wallets to authenticated;

drop policy if exists "Users can read their own Quid Gateway wallet" on public.quid_gateway_wallets;
create policy "Users can read their own Quid Gateway wallet"
on public.quid_gateway_wallets
for select
to authenticated
using (auth.uid() = owner_id);
