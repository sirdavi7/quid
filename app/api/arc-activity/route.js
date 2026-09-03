import { NextResponse } from 'next/server'
import { createPublicClient, formatUnits, http, parseAbiItem, parseUnits } from 'viem'
import { arcTestnet, ARC_EXPLORER_URL, ARC_TESTNET_ID, usdcAbi } from '@/lib/arc'
import { chains, chainOptions } from '@/lib/chains'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listPagesForOwner, listPaymentsForOwner, listWalletActivityForOwner, listWalletsForPage, upsertWalletActivityRecords } from '@/lib/store'

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')
const zeroAddress = '0x0000000000000000000000000000000000000000'

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0])
})

function createChainClient(option) {
  const chain = chains.find((item) => item.id === option.id)

  if (option.id === ARC_TESTNET_ID) {
    return client
  }

  if (!chain?.rpcUrls?.default?.http?.[0]) {
    throw new Error(`${option.label} RPC is not configured.`)
  }

  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0])
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

function sourceLabel(fromAddress) {
  return String(fromAddress ?? '').toLowerCase() === zeroAddress ? 'Faucet deposit' : 'Direct deposit'
}

function toUsdcUnits(value) {
  try {
    return parseUnits(String(value ?? 0), 6)
  } catch {
    return 0n
  }
}

async function getReceivedWalletBalance({ chainClient, option, walletAddress }) {
  return chainClient.readContract({
    address: option.usdcAddress,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: [walletAddress]
  })
}

function normalizeAddress(address) {
  return String(address ?? '').toLowerCase()
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

function incomingPaymentTouchesChain(payment, option) {
  if (payment.kind === 'outgoing') {
    return false
  }

  return (payment.destinationChain ?? 'Arc Testnet') === option.label
}

function outgoingPaymentTouchesWallet(payment, wallet, option) {
  return (
    payment.kind === 'outgoing' &&
    payment.sourceChain === option.label &&
    normalizeAddress(payment.payerAddress) === normalizeAddress(wallet.walletAddress)
  )
}

function activityTouchesWallet(activity, wallet, option) {
  return activity.chain === option.label && normalizeAddress(activity.walletAddress) === normalizeAddress(wallet.walletAddress)
}

export async function POST() {
  try {
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
    const payments = await listPaymentsForOwner(user.id, 100)
    const checkoutTxHashes = new Set(
      payments
        .map(paymentTxHash)
        .filter(Boolean)
        .map((hash) => hash.toLowerCase())
    )
    const warnings = []
    const records = []

    for (const wallet of wallets) {
      const option = chainOptions.find((item) => item.id === wallet.chainId)

      if (!option?.usdcAddress || !wallet.walletAddress) {
        continue
      }

      try {
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

        records.push(...recentLogs.map((log, index) => ({
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
        })))
      } catch (error) {
        warnings.push(`${option.label}: ${error.message ?? 'activity scan failed'}`)
      }
    }

    await upsertWalletActivityRecords(records)

    const storedActivities = await listWalletActivityForOwner(user.id, 200)
    const balanceSyncRecords = []

    for (const wallet of wallets) {
      const option = chainOptions.find((item) => item.id === wallet.chainId)

      if (!option?.usdcAddress || !wallet.walletAddress) {
        continue
      }

      try {
        const chainClient = createChainClient(option)
        const receivedWalletBalance = await getReceivedWalletBalance({
          chainClient,
          option,
          walletAddress: wallet.walletAddress
        })
        const incomingCheckoutTotal = payments
          .filter((payment) => incomingPaymentTouchesChain(payment, option))
          .reduce((total, payment) => total + toUsdcUnits(payment.amount), 0n)
        const outgoingFromReceivedWalletTotal = payments
          .filter((payment) => outgoingPaymentTouchesWallet(payment, wallet, option))
          .reduce((total, payment) => total + toUsdcUnits(payment.amount), 0n)
        const storedDirectTotal = storedActivities
          .filter((activity) => activityTouchesWallet(activity, wallet, option))
          .reduce((total, activity) => total + toUsdcUnits(activity.amount), 0n)
        const unrecordedDirectBalance = receivedWalletBalance + outgoingFromReceivedWalletTotal - incomingCheckoutTotal - storedDirectTotal

        if (unrecordedDirectBalance > 0n) {
          balanceSyncRecords.push({
            pageId: page.id,
            ownerId: page.ownerId,
            pageUsername: page.username,
            walletAddress: wallet.walletAddress,
            fromAddress: null,
            toAddress: wallet.walletAddress,
            amount: formatUnits(unrecordedDirectBalance, 6),
            asset: 'USDC',
            chain: option.label,
            txHash: `balance-sync-${page.id}-${option.id}-${receivedWalletBalance.toString()}`,
            explorerUrl: getExplorerUrl(option, 'address', wallet.walletAddress),
            source: 'Received USDC',
            blockNumber: null,
            happenedAt: new Date().toISOString()
          })
        }
      } catch (error) {
        warnings.push(`${option.label}: ${error.message ?? 'balance sync failed'}`)
      }
    }

    await upsertWalletActivityRecords(balanceSyncRecords)

    const activities = await listWalletActivityForOwner(user.id, 30)

    return NextResponse.json({
      activities,
      synced: records.length + balanceSyncRecords.length,
      warning: warnings.length ? warnings.join('; ') : null
    })
  } catch (error) {
    const message = String(error.message ?? '')

    if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('defined limit')) {
      return NextResponse.json({ error: 'Wallet activity is rate limited right now. Saved wallet activity will still appear.' }, { status: 429 })
    }

    return NextResponse.json({ error: message || 'Wallet activity sync failed.' }, { status: 500 })
  }
}
