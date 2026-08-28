create extension if not exists pgcrypto;

create table if not exists public.quid_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  headline text not null,
  note text not null default '',
  wallet_id text not null,
  wallet_address text not null,
  wallet_blockchain text not null default 'ARC-TESTNET',
  wallet_account_type text not null default 'EOA',
  wallet_mocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quid_pages_one_per_owner unique (owner_id),
  constraint quid_pages_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

alter table public.quid_pages drop column if exists owner_email;

create index if not exists quid_pages_owner_id_idx on public.quid_pages(owner_id);
create index if not exists quid_pages_username_idx on public.quid_pages(username);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quid_pages_set_updated_at on public.quid_pages;
create trigger quid_pages_set_updated_at
before update on public.quid_pages
for each row execute function public.set_updated_at();

alter table public.quid_pages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.quid_pages to anon, authenticated;
grant insert, update, delete on public.quid_pages to authenticated;

drop policy if exists "Public can read Quid payment pages" on public.quid_pages;
drop policy if exists "Users can read their own Quid page" on public.quid_pages;
drop policy if exists "Users can create their own Quid page" on public.quid_pages;
drop policy if exists "Users can update their own Quid page" on public.quid_pages;
drop policy if exists "Users can delete their own Quid page" on public.quid_pages;

create policy "Users can read their own Quid page"
on public.quid_pages
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can create their own Quid page"
on public.quid_pages
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update their own Quid page"
on public.quid_pages
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete their own Quid page"
on public.quid_pages
for delete
to authenticated
using (auth.uid() = owner_id);