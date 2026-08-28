import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Run this with those env vars set in your terminal. Do not commit the service role key.')
  process.exit(1)
}

const pagesPath = path.join(process.cwd(), 'data', 'pages.json')
const raw = await readFile(pagesPath, 'utf8')
const pages = Object.values(JSON.parse(raw))
  .filter((page) => page.ownerId)
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

const preferredUsername = 'sirdavid'
const selectedByOwner = new Map()

for (const page of pages) {
  const selected = selectedByOwner.get(page.ownerId)

  if (!selected || page.username === preferredUsername) {
    selectedByOwner.set(page.ownerId, page)
  }
}

const rows = Array.from(selectedByOwner.values()).map((page) => ({
  owner_id: page.ownerId,
  name: page.name,
  username: page.username,
  headline: page.headline,
  note: page.note ?? '',
  wallet_id: page.walletId,
  wallet_address: page.walletAddress,
  wallet_blockchain: page.walletBlockchain ?? 'ARC-TESTNET',
  wallet_account_type: page.walletAccountType ?? 'EOA',
  wallet_mocked: Boolean(page.walletMocked),
  created_at: page.createdAt
}))

if (!rows.length) {
  console.log('No owned local pages found to migrate.')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

const { data, error } = await supabase
  .from('quid_pages')
  .upsert(rows, { onConflict: 'owner_id' })
  .select('username, wallet_address')

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Migrated ${data.length} Quid page(s):`)
for (const page of data) {
  console.log(`- /pay/${page.username} ${page.wallet_address}`)
}