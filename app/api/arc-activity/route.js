import { NextResponse } from 'next/server'
import { createPublicClient, formatUnits, http, parseAbiItem } from 'viem'
import { arcTestnet, ARC_EXPLORER_URL, ARC_TESTNET_ID } from '@/lib/arc'
import { fetchIncomingUsdcTransfers } from '@/lib/arcscan'
import { chains, chainOptions } from '@/lib/chains'
import { getServerRpcUrl } from '@/lib/server-rpc'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeApiError, logServerError } from '@/lib/user-errors'
import { createPaymentRecord, getQuidPageAliasesForAddresses, listPagesForOwner, listPaymentsForOwner, listWalletActivityForOwner, listWalletsForPage, upsertWalletActivityRecords } from '@/lib/store'

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')
const zeroAddress = '0x0000000000000000000000000000000000000000'
// Direct deposits recorded as payments per request. Any remainder is picked up
// by the next sync, so one request never runs unbounded.
const MAX_DEPOSIT_PAYMENTS_PER_RUN = 30
const DEEP_SYNC_PAGES = 6

function createChainClient(option) {
  const chain = option.id === ARC_TESTNET_ID
    ? arcTestnet
    : chains.find((item) => item.id === option.id)
  const rpcUrl = getServerRpcUrl(option.id)

  if (!chain || !rpcUrl) {
    throw new Error(`${option.label} RPC is not configured.`)
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  })
}

function getExplorerUrl(option, type, value) {
  const chain = chains.find((item) => item.id === option.id)
  const baseUrl = chain?.blockExplorers?.default?.url ?? (option.id === ARC_TESTNET_ID ? ARC_EXPLORER_URL : '')

  return baseUrl ? `${baseUrl}/${type}/${value}` : null
}

async function getIncomingTransferLogs({ chainClient, option, walletAddress }) {
  const latestBlock = await chainClient.getBlockNumber()
  const chunkSize = option.id === ARC_TESTNET_ID ? 75n : 400n
  const maxChunks = option.id === ARC_TESTNET_ID ? 10 : 8
  const logs = []

  for (let chunk = 0; chunk < maxChunks && logs.length < 12; chunk += 1) {
    const toBlock = latestBlock - BigInt(chunk) * chunkSize

    if (toBlock < 0n) {
      break
    }

    const fromBlock = toBlock > chunkSize ? toBlock - chunkSize + 1n : 0n

    try {
      const chunkLogs = await chainClient.getLogs({
        address: option.usdcAddress,
        event: transferEvent,
        args: { to: walletAddress },
        fromBlock,
        toBlock
      })

      logs.push(...chunkLogs)
    } catch (error) {
      const message = String(error.message ?? '').toLowerCase()

      if (message.includes('rate limit') || message.includes('defined limit') || message.includes('size too large')) {
        break
      }

      throw error
    }
  }

  return logs
}

async function scanRecentLogs({ option, wallet, page, checkoutTxHashes }) {
  const chainClient = createChainClient(option)
  const logs = await getIncomingTransferLogs({
    chainClient,
    option,
    walletAddress: wallet.walletAddress
  })
  const recentLogs = logs
    .filter((log) => !checkoutTxHashes.has(log.transactionHash.toLowerCase()))
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, 8)
  const blocks = await Promise.all(
    recentLogs.map((log) => chainClient.getBlock({ blockNumber: log.blockNumber }))
  )

  return recentLogs.map((log, index) => ({
    pageId: page.id,
    ownerId: page.ownerId,
    pageUsername: page.username,
    walletAddress: wallet.walletAddress,
    fromAddress: log.args.from,
    toAddress: log.args.to,
    amount: formatUnits(log.args.value, 6),
    asset: 'USDC',
    chain: option.label,
    txHash: log.transactionHash,
    explorerUrl: getExplorerUrl(option, 'tx', log.transactionHash),
    source: sourceLabel(log.args.from),
    blockNumber: log.blockNumber.toString(),
    happenedAt: new Date(Number(blocks[index].timestamp) * 1000).toISOString()
  }))
}

// Full incoming history for the Arc wallet from the explorer API. Transfers that
// Quid has not recorded yet become activity rows and confirmed deposit payments.
async function indexArcDeposits({ option, wallet, page, paymentHashes, activityHashes, deep }) {
  const { records: transfers } = await fetchIncomingUsdcTransfers({
    walletAddress: wallet.walletAddress,
    usdcAddress: option.usdcAddress,
    maxPages: deep ? DEEP_SYNC_PAGES : 1,
    knownTxHashes: paymentHashes,
    stopWhenPageKnown: !deep
  })

  // Checkout payments already have a payment row and get their own activity
  // entry when they are reconciled, so only unrecorded transfers are handled here.
  const unrecorded = transfers.filter((transfer) => !paymentHashes.has(transfer.txHash))

  return unrecorded.map((transfer) => ({
    pageId: page.id,
    ownerId: page.ownerId,
    pageUsername: page.username,
    walletAddress: wallet.walletAddress,
    fromAddress: transfer.fromAddress,
    toAddress: transfer.toAddress,
    amount: transfer.amount,
    asset: 'USDC',
    chain: option.label,
    txHash: transfer.txHash,
    explorerUrl: getExplorerUrl(option, 'tx', transfer.txHash),
    source: sourceLabel(transfer.fromAddress),
    blockNumber: transfer.blockNumber,
    happenedAt: transfer.happenedAt,
    needsActivity: !activityHashes.has(transfer.txHash)
  }))
}

function sourceLabel(fromAddress) {
  return String(fromAddress ?? '').toLowerCase() === zeroAddress ? 'Faucet deposit' : 'Direct deposit'
}

function fallbackArcWallet(page) {
  if (!page?.walletAddress) {
    return null
  }

  const arc = chainOptions[0]

  return {
    pageId: page.id,
    ownerId: page.ownerId,
    pageUsername: page.username,
    walletId: page.walletId,
    walletAddress: page.walletAddress,
    walletBlockchain: page.walletBlockchain,
    walletAccountType: page.walletAccountType,
    chainId: arc.id,
    chainLabel: arc.label,
    gatewayName: arc.gatewayName,
    usdcAddress: arc.usdcAddress,
    mocked: page.walletMocked
  }
}

async function getReceiveWallets(page) {
  const wallets = await listWalletsForPage(page.id)
  const arcWallet = fallbackArcWallet(page)

  if (arcWallet && !wallets.some((wallet) => wallet.chainId === arcWallet.chainId)) {
    return [arcWallet, ...wallets]
  }

  return wallets
}

function paymentTxHash(payment) {
  return payment.txHash || payment.explorerUrl?.split('/tx/')[1]
}

function isSyntheticBalanceRecord(activity) {
  const source = String(activity.source ?? '').toLowerCase()
  const txHash = String(activity.txHash ?? '').toLowerCase()

  return source.includes('balance sync') || source.includes('source not identified') || txHash.startsWith('balance-sync-')
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const deep = body?.deep === true
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user

    if (!user) {
      return NextResponse.json({ error: 'Sign in to sync wallet activity.' }, { status: 401 })
    }

    const pages = await listPagesForOwner(user.id)
    const page = pages[0]

    if (!page) {
      return NextResponse.json({ activities: [] })
    }

    if (page.walletMocked) {
      return NextResponse.json({ activities: [], synced: 0 })
    }

    const wallets = await getReceiveWallets(page)
    const [payments, storedActivity] = await Promise.all([
      listPaymentsForOwner(user.id, 500),
      listWalletActivityForOwner(user.id, 500)
    ])
    const paymentHashes = new Set(
      payments
        .map(paymentTxHash)
        .filter(Boolean)
        .map((hash) => hash.toLowerCase())
    )
    const activityHashes = new Set(
      storedActivity
        .map((activity) => String(activity.txHash ?? '').toLowerCase())
        .filter(Boolean)
    )
    const warnings = []
    const records = []
    const depositPayments = []

    for (const wallet of wallets) {
      const option = chainOptions.find((item) => item.id === wallet.chainId)

      if (!option?.usdcAddress || !wallet.walletAddress) {
        continue
      }

      let scanned = false

      if (option.id === ARC_TESTNET_ID) {
        try {
          const arcRecords = await indexArcDeposits({ option, wallet, page, paymentHashes, activityHashes, deep })
          records.push(...arcRecords.filter((record) => record.needsActivity))
          depositPayments.push(...arcRecords)
          scanned = true
        } catch (error) {
          logServerError(`Arc explorer history ${option.label}`, error)
          warnings.push('Full Arc transfer history could not be checked right now. Showing recent on-chain activity only.')
        }
      }

      if (scanned) {
        continue
      }

      try {
        records.push(...await scanRecentLogs({ option, wallet, page, checkoutTxHashes: paymentHashes }))
      } catch (error) {
        logServerError(`Wallet activity scan ${option.label}`, error)
        warnings.push(getSafeApiError(error, { chainLabel: option.label, nativeSymbol: option.nativeSymbol, fallback: `Latest ${option.label} activity could not be refreshed. Saved wallet transactions are still shown below.` }))
      }
    }

    const insertedActivity = await upsertWalletActivityRecords(
      records.map(({ needsActivity, ...record }) => record)
    )

    // Unrecorded Arc deposits also become confirmed payment rows, so they show in
    // Quid money movement and Recent activity just like withdrawals do.
    let depositsRecorded = 0
    const toRecord = depositPayments
      .sort((a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt))
      .slice(0, MAX_DEPOSIT_PAYMENTS_PER_RUN)

    for (const deposit of toRecord) {
      try {
        await createPaymentRecord({
          pageUsername: page.username,
          payerAddress: deposit.fromAddress,
          recipientAddress: deposit.walletAddress,
          amount: deposit.amount,
          sourceChain: deposit.chain,
          destinationChain: deposit.chain,
          txHash: deposit.txHash,
          explorerUrl: deposit.explorerUrl,
          blockNumber: deposit.blockNumber,
          status: 'confirmed',
          kind: 'incoming',
          operation: 'direct-deposit',
          note: deposit.source,
          confirmedAt: deposit.happenedAt,
          createdAt: deposit.happenedAt
        })
        depositsRecorded += 1
      } catch (error) {
        logServerError('Record direct deposit', error)
        warnings.push('Some received transfers could not be saved yet. They will be retried on the next refresh.')
        break
      }
    }

    // A wallet balance delta is not proof of a transaction's sender or route.
    // Show only indexed transfers and Quid-recorded operations in activity.
    const activities = (await listWalletActivityForOwner(user.id, 100))
      .filter((activity) => !isSyntheticBalanceRecord(activity))
    const addressAliases = await getQuidPageAliasesForAddresses(
      activities.flatMap((activity) => [activity.fromAddress, activity.toAddress])
    )

    return NextResponse.json({
      activities,
      addressAliases,
      synced: insertedActivity.length + depositsRecorded,
      pending: Math.max(0, depositPayments.length - toRecord.length),
      checkedAt: new Date().toISOString(),
      warning: warnings.length ? [...new Set(warnings)].join('; ') : null
    })
  } catch (error) {
    const message = String(error.message ?? '')

    if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('defined limit')) {
      return NextResponse.json({ error: 'Wallet activity is rate limited right now. Saved wallet activity will still appear.' }, { status: 429 })
    }

    logServerError('Wallet activity sync', error)
    return NextResponse.json({ error: getSafeApiError(error, { fallback: 'Wallet activity is unavailable right now. Saved transactions will remain visible.' }) }, { status: 500 })
  }
}
