create table if not exists public.quid_page_wallets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.quid_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_username text not null,
  wallet_id text not null,
  wallet_address text not null,
  wallet_blockchain text not null,
  wallet_account_type text not null default 'EOA',
  chain_id bigint not null,
  chain_label text not null,
  gateway_name text not null,
  usdc_address text not null,
  mocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quid_page_wallets_page_chain_unique unique (page_id, chain_id)
);

create index if not exists quid_page_wallets_owner_id_idx on public.quid_page_wallets(owner_id);
create index if not exists quid_page_wallets_page_id_idx on public.quid_page_wallets(page_id);
create index if not exists quid_page_wallets_page_username_idx on public.quid_page_wallets(page_username);

drop trigger if exists quid_page_wallets_set_updated_at on public.quid_page_wallets;
create trigger quid_page_wallets_set_updated_at
before update on public.quid_page_wallets
for each row execute function public.set_updated_at();

alter table public.quid_page_wallets enable row level security;

grant select on public.quid_page_wallets to anon, authenticated;
grant insert, update, delete on public.quid_page_wallets to authenticated;

drop policy if exists "Public can read Quid page wallets" on public.quid_page_wallets;
drop policy if exists "Users can read their own Quid page wallets" on public.quid_page_wallets;
drop policy if exists "Users can create their own Quid page wallets" on public.quid_page_wallets;
drop policy if exists "Users can update their own Quid page wallets" on public.quid_page_wallets;
drop policy if exists "Users can delete their own Quid page wallets" on public.quid_page_wallets;

create policy "Users can read their own Quid page wallets"
on public.quid_page_wallets
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can create their own Quid page wallets"
on public.quid_page_wallets
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update their own Quid page wallets"
on public.quid_page_wallets
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete their own Quid page wallets"
on public.quid_page_wallets
for delete
to authenticated
using (auth.uid() = owner_id);
