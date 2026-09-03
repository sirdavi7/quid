import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function toPage(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    headline: row.headline,
    note: row.note ?? '',
    walletId: row.wallet_id,
    walletAddress: row.wallet_address,
    walletBlockchain: row.wallet_blockchain,
    walletAccountType: row.wallet_account_type,
    walletMocked: row.wallet_mocked,
    ownerId: row.owner_id,
    ownerEmail: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toPayment(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    pageId: row.page_id,
    ownerId: row.owner_id,
    pageUsername: row.page_username,
    payerAddress: row.payer_address,
    recipientAddress: row.recipient_address,
    amount: row.amount,
    asset: row.asset,
    sourceChain: row.source_chain,
    destinationChain: row.destination_chain,
    txHash: row.tx_hash,
    explorerUrl: row.explorer_url,
    status: row.status,
    kind: row.kind,
    note: row.note ?? '',
    createdAt: row.created_at
  }
}

function toWalletActivity(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    pageId: row.page_id,
    ownerId: row.owner_id,
    pageUsername: row.page_username,
    walletAddress: row.wallet_address,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amount: row.amount,
    asset: row.asset,
    chain: row.chain,
    txHash: row.tx_hash,
    explorerUrl: row.explorer_url,
    source: row.source,
    blockNumber: row.block_number,
    happenedAt: row.happened_at,
    createdAt: row.created_at
  }
}

function toPageWallet(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    pageId: row.page_id,
    ownerId: row.owner_id,
    pageUsername: row.page_username,
    walletId: row.wallet_id,
    walletAddress: row.wallet_address,
    walletBlockchain: row.wallet_blockchain,
    walletAccountType: row.wallet_account_type,
    chainId: Number(row.chain_id),
    chainLabel: row.chain_label,
    gatewayName: row.gateway_name,
    usdcAddress: row.usdc_address,
    mocked: row.mocked,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toRow(data) {
  return {
    name: data.name,
    username: data.username,
    headline: data.headline,
    note: data.note ?? '',
    wallet_id: data.walletId,
    wallet_address: data.walletAddress,
    wallet_blockchain: data.walletBlockchain,
    wallet_account_type: data.walletAccountType,
    wallet_mocked: data.walletMocked,
    owner_id: data.ownerId
  }
}

function toPaymentRow(data) {
  return {
    page_id: data.pageId,
    owner_id: data.ownerId,
    page_username: data.pageUsername,
    payer_address: data.payerAddress ?? null,
    recipient_address: data.recipientAddress,
    amount: data.amount,
    asset: data.asset ?? 'USDC',
    source_chain: data.sourceChain ?? 'Arc Testnet',
    destination_chain: data.destinationChain ?? 'Arc Testnet',
    tx_hash: data.txHash ?? null,
    explorer_url: data.explorerUrl ?? null,
    status: data.status ?? 'submitted',
    kind: data.kind ?? 'incoming',
    note: data.note ?? ''
  }
}

function toWalletActivityRow(data) {
  return {
    page_id: data.pageId,
    owner_id: data.ownerId,
    page_username: data.pageUsername,
    wallet_address: data.walletAddress,
    from_address: data.fromAddress ?? null,
    to_address: data.toAddress,
    amount: data.amount,
    asset: data.asset ?? 'USDC',
    chain: data.chain ?? 'Arc Testnet',
    tx_hash: data.txHash,
    explorer_url: data.explorerUrl,
    source: data.source ?? 'Direct deposit',
    block_number: data.blockNumber ?? null,
    happened_at: data.happenedAt ?? new Date().toISOString()
  }
}

function toPageWalletRow(data) {
  return {
    page_id: data.pageId,
    owner_id: data.ownerId,
    page_username: data.pageUsername,
    wallet_id: data.walletId,
    wallet_address: data.walletAddress,
    wallet_blockchain: data.walletBlockchain,
    wallet_account_type: data.walletAccountType ?? 'EOA',
    chain_id: data.chainId,
    chain_label: data.chainLabel,
    gateway_name: data.gatewayName,
    usdc_address: data.usdcAddress,
    mocked: data.mocked ?? false
  }
}

function getSupabase() {
  return createSupabaseServerClient()
}

export async function listPages() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('quid_pages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data.map(toPage)
}

export async function listPagesForOwner(ownerId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_pages')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data.map(toPage)
}

export async function getPageForOwner(ownerId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_pages')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return toPage(data)
}

export async function getPage(username) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_pages')
    .select('*')
    .eq('username', String(username).toLowerCase())
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return toPage(data)
}

export async function createPage(data) {
  const username = data.username.toLowerCase().trim()
  const supabase = getSupabase()
  const { data: row, error } = await supabase
    .from('quid_pages')
    .insert(toRow({ ...data, username }))
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('owner')) {
        throw new Error('This account already has a Quid page.')
      }

      throw new Error('Username already taken.')
    }

    throw new Error(error.message)
  }

  return toPage(row)
}

export async function updatePageForOwner(ownerId, username, data) {
  const updates = {
    name: String(data.name ?? '').trim(),
    headline: String(data.headline ?? '').trim(),
    note: String(data.note ?? '').trim()
  }

  if (!updates.name || !updates.headline) {
    throw new Error('Display name and headline are required.')
  }

  const supabase = getSupabase()
  const { data: row, error } = await supabase
    .from('quid_pages')
    .update(updates)
    .eq('owner_id', ownerId)
    .eq('username', String(username).toLowerCase())
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toPage(row)
}

export async function upsertPageWalletRecords(records) {
  if (!records.length) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_page_wallets')
    .upsert(records.map(toPageWalletRow), {
      onConflict: 'page_id,chain_id'
    })
    .select('*')

  if (error) {
    if (error.message.includes('quid_page_wallets')) {
      return []
    }

    throw new Error(error.message)
  }

  return (data ?? []).map(toPageWallet)
}

export async function listWalletsForPage(pageId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_page_wallets')
    .select('*')
    .eq('page_id', pageId)
    .order('chain_label', { ascending: true })

  if (error) {
    if (error.message.includes('quid_page_wallets')) {
      return []
    }

    throw new Error(error.message)
  }

  return (data ?? []).map(toPageWallet)
}

export async function getWalletForPageChain(pageId, chainId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_page_wallets')
    .select('*')
    .eq('page_id', pageId)
    .eq('chain_id', Number(chainId))
    .maybeSingle()

  if (error) {
    if (error.message.includes('quid_page_wallets')) {
      return null
    }

    throw new Error(error.message)
  }

  return toPageWallet(data)
}
export async function listPaymentsForOwner(ownerId, limit = 10) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_payments')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.message.includes('quid_payments')) {
      return []
    }

    throw new Error(error.message)
  }

  return data.map(toPayment)
}

export async function getPaymentSummaryForOwner(ownerId) {
  const payments = await listPaymentsForOwner(ownerId, 100)
  const incoming = payments.filter((payment) => payment.kind === 'incoming' && payment.status !== 'failed')
  const totalReceived = incoming.reduce((total, payment) => total + Number(payment.amount), 0)

  return {
    totalReceived,
    paymentCount: incoming.length,
    latestPaymentAt: incoming[0]?.createdAt ?? null
  }
}

export async function listWalletActivityForOwner(ownerId, limit = 8) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_wallet_activity')
    .select('*')
    .eq('owner_id', ownerId)
    .order('happened_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.message.includes('quid_wallet_activity')) {
      return []
    }

    throw new Error(error.message)
  }

  return (data ?? []).map(toWalletActivity)
}

export async function upsertWalletActivityRecords(records) {
  if (!records.length) {
    return []
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('quid_wallet_activity')
    .upsert(records.map(toWalletActivityRow), {
      onConflict: 'tx_hash',
      ignoreDuplicates: true
    })
    .select('*')

  if (error) {
    if (error.message.includes('quid_wallet_activity')) {
      return []
    }

    throw new Error(error.message)
  }

  return (data ?? []).map(toWalletActivity)
}

export async function createPaymentRecord(data) {
  const page = await getPage(data.pageUsername)

  if (!page) {
    throw new Error('Quid page not found.')
  }

  const amount = Number(data.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    throw new Error('Enter a valid USDC amount.')
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error } = await supabase
    .from('quid_payments')
    .insert(toPaymentRow({
      pageId: page.id,
      ownerId: page.ownerId,
      pageUsername: page.username,
      payerAddress: data.payerAddress,
      recipientAddress: data.recipientAddress ?? page.walletAddress,
      amount: amount.toFixed(6),
      asset: data.asset,
      sourceChain: data.sourceChain,
      destinationChain: data.destinationChain,
      txHash: data.txHash,
      explorerUrl: data.explorerUrl,
      status: data.status,
      kind: data.kind,
      note: data.note
    }))
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toPayment(row)
}

export async function updatePaymentExplorerForOwner(ownerId, paymentId, data) {
  const updates = {
    tx_hash: data.txHash,
    explorer_url: data.explorerUrl,
    status: data.status
  }
  const supabase = createSupabaseAdminClient()
  const { data: row, error } = await supabase
    .from('quid_payments')
    .update(updates)
    .eq('id', paymentId)
    .eq('owner_id', ownerId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toPayment(row)
}

