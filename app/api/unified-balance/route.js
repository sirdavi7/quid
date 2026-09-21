import { NextResponse } from 'next/server'
import { createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem'
import { ARC_EXPLORER_URL, ARC_TESTNET_CHAIN, ARC_USDC_ADDRESS, arcTestnet } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'
import { GATEWAY_WALLET_EVM_TESTNET, createQuidGatewayWallet } from '@/lib/circleWallets'
import { createPaymentRecord, getGatewayWalletForPage, getPageForOwner, getWalletForPageChain, listWalletsForPage, upsertGatewayWalletRecord, upsertWalletActivityRecords } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createCircleWalletsUnifiedAdapter, createServerUnifiedBalanceKit } from '@/lib/unifiedBalance'
import { getOnchainActionBlockMessage } from '@/lib/runtime-network'
import { getSafeApiError, logServerError } from '@/lib/user-errors'
import { validateAddress, validateAmount } from '@/lib/validation'

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(arcTestnet.rpcUrls.default.http[0])
})
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

function getSourceChain(chainId) {
  return chainOptions.find((option) => option.id === Number(chainId)) ?? chainOptions[0]
}

function getResultHash(result) {
  return result?.txHash ?? result?.transactionHash ?? result?.hash ?? result?.transferId
}

function normalizeAddress(address) {
  return String(address ?? '').toLowerCase()
}

async function getGatewayWithdrawalTransfer(txHash, recipientAddress) {
  if (!String(txHash ?? '').startsWith('0x')) {
    return null
  }

  try {
    const receipt = await arcClient.getTransactionReceipt({ hash: txHash })
    const transfer = receipt.logs
      .filter((log) => normalizeAddress(log.address) === normalizeAddress(ARC_USDC_ADDRESS))
      .map((log) => {
        try {
          return decodeEventLog({
            abi: [transferEvent],
            data: log.data,
            topics: log.topics
          })
        } catch {
          return null
        }
      })
      .find((event) => (
        event?.eventName === 'Transfer' &&
        normalizeAddress(event.args.to) === normalizeAddress(recipientAddress)
      ))

    if (!transfer) {
      return null
    }

    const block = await arcClient.getBlock({ blockNumber: receipt.blockNumber })

    return {
      fromAddress: transfer.args.from,
      toAddress: transfer.args.to,
      blockNumber: receipt.blockNumber.toString(),
      happenedAt: new Date(Number(block.timestamp) * 1000).toISOString()
    }
  } catch (error) {
    logServerError('Gateway withdrawal transaction lookup', error)
    return null
  }
}

function isRetryableRpcError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()

  return (
    message.includes('rpc endpoint error') ||
    message.includes('network connection') ||
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('rate limit')
  )
}

async function withRpcRetry(operation) {
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isRetryableRpcError(error) || attempt === 2) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
    }
  }

  throw lastError
}

function getLegacyWallets(wallets, gatewayAddress) {
  const byAddress = new Map()

  for (const wallet of wallets) {
    const address = String(wallet.walletAddress ?? '')
    if (!address || normalizeAddress(address) === normalizeAddress(gatewayAddress)) {
      continue
    }

    const current = byAddress.get(normalizeAddress(address)) ?? {
      walletAddress: address,
      chainLabels: []
    }
    current.chainLabels.push(wallet.chainLabel)
    byAddress.set(normalizeAddress(address), current)
  }

  return [...byAddress.values()]
}

export async function POST(request) {
  const networkBlockMessage = getOnchainActionBlockMessage()

  if (networkBlockMessage) {
    return NextResponse.json({ error: networkBlockMessage }, { status: 503 })
  }

  let body = {}

  try {
    body = await request.json()
    const action = body.action
    const amount = String(body.amount ?? '')
    const source = getSourceChain(body.sourceChainId)
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to use Gateway wallet actions.' }, { status: 401 })
    }

    const page = await getPageForOwner(data.user.id)

    if (!page) {
      return NextResponse.json({ error: 'Create a Quid page before using Gateway.' }, { status: 404 })
    }

    if (page.walletMocked || !page.walletAddress) {
      return NextResponse.json({ error: 'This Quid page does not have a live Circle wallet yet.' }, { status: 400 })
    }

    const sourceWallet = await getWalletForPageChain(page.id, source.id)
    const sourceAddress = sourceWallet?.walletAddress ?? page.walletAddress

    if (action === 'setup') {
      const existing = await getGatewayWalletForPage(page.id)

      if (existing) {
        return NextResponse.json({ gatewayWallet: existing, created: false })
      }

      const created = await createQuidGatewayWallet()
      const gatewayWallet = await upsertGatewayWalletRecord({
        pageId: page.id,
        ownerId: page.ownerId,
        pageUsername: page.username,
        walletId: created.id,
        walletAddress: created.address,
        walletBlockchain: created.blockchain,
        walletAccountType: created.accountType,
        mocked: created.mocked
      })

      return NextResponse.json({ gatewayWallet, created: true })
    }

    const gatewayWallet = await getGatewayWalletForPage(page.id)

    if (!gatewayWallet?.walletAddress) {
      return NextResponse.json({ error: 'Set up your Quid Gateway wallet before checking, depositing, or withdrawing Gateway USDC.' }, { status: 400 })
    }

    if (action === 'balances') {
      const kit = createServerUnifiedBalanceKit()
      const balances = await withRpcRetry(() => kit.getBalances({
        sources: { address: gatewayWallet.walletAddress },
        networkType: 'testnet'
      }))
      const pageWallets = await listWalletsForPage(page.id)
      const legacyWallets = getLegacyWallets(pageWallets, gatewayWallet.walletAddress)
      const legacyResults = await Promise.allSettled(
        legacyWallets.map(async (wallet) => ({
          ...wallet,
          balances: await withRpcRetry(() => kit.getBalances({
            sources: { address: wallet.walletAddress },
            networkType: 'testnet'
          }))
        }))
      )
      const legacyBalances = legacyResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)

      return NextResponse.json({ balances, gatewayWallet, legacyBalances })
    }

    if (action === 'deposit') {
      if (!validateAmount(amount)) {
        return NextResponse.json({ error: 'Enter a valid USDC amount before depositing to Gateway.' }, { status: 400 })
      }

      if (body.confirmed !== true) {
        return NextResponse.json({ error: 'Confirm the Gateway deposit before submitting it.' }, { status: 400 })
      }

      if (source.gatewayDepositSupported === false) {
        return NextResponse.json({ error: `Gateway deposits are not available on ${source.label} yet.` }, { status: 400 })
      }

      if (!sourceWallet?.walletId) {
        return NextResponse.json({ error: `Set up the ${source.label} receive wallet before depositing to Gateway.` }, { status: 400 })
      }

      const kit = createServerUnifiedBalanceKit()
      const adapter = createCircleWalletsUnifiedAdapter()
      const result = await kit.depositFor({
        from: {
          adapter,
          chain: source.gatewayName,
          address: sourceAddress
        },
        amount,
        depositAccount: gatewayWallet.walletAddress
      })
      const txHash = getResultHash(result)
      const explorerUrl = result?.explorerUrl ?? null
      const recordResults = await Promise.allSettled([
        createPaymentRecord({
          pageUsername: page.username,
          payerAddress: sourceAddress,
          recipientAddress: GATEWAY_WALLET_EVM_TESTNET,
          amount,
          sourceChain: source.label,
          destinationChain: source.label,
          txHash,
          explorerUrl,
          status: 'confirmed',
          kind: 'outgoing',
          note: 'Gateway deposit'
        }),
        upsertWalletActivityRecords([{
          pageId: page.id,
          ownerId: page.ownerId,
          pageUsername: page.username,
          walletAddress: sourceAddress,
          fromAddress: sourceAddress,
          toAddress: GATEWAY_WALLET_EVM_TESTNET,
          amount,
          asset: 'USDC',
          chain: source.label,
          txHash,
          explorerUrl,
          source: 'Gateway deposit',
          blockNumber: result?.blockNumber ?? null
        }])
      ])

      recordResults.forEach((recordResult, index) => {
        if (recordResult.status === 'rejected') {
          logServerError(index === 0 ? 'Gateway deposit payment record' : 'Gateway deposit activity record', recordResult.reason)
        }
      })

      return NextResponse.json({ result, source, gatewayWallet, payment: recordResults[0].status === 'fulfilled' ? recordResults[0].value : null })
    }

    if (action === 'send') {
      const kit = createServerUnifiedBalanceKit()
      const adapter = createCircleWalletsUnifiedAdapter()
      const recipientAddress = String(body.recipientAddress ?? '')
      if (!validateAddress(recipientAddress)) {
        return NextResponse.json({ error: 'Enter a valid recipient address before withdrawing Gateway USDC.' }, { status: 400 })
      }
      if (!validateAmount(amount)) {
        return NextResponse.json({ error: 'Enter a valid USDC amount before withdrawing Gateway USDC.' }, { status: 400 })
      }

      if (body.confirmed !== true) {
        return NextResponse.json({ error: 'Confirm the Gateway withdrawal before submitting it.' }, { status: 400 })
      }

      const result = await kit.spend({
        from: {
          adapter,
          address: gatewayWallet.walletAddress
        },
        to: {
          chain: ARC_TESTNET_CHAIN,
          recipientAddress,
          useForwarder: true
        },
        amount
      })

      const txHash = getResultHash(result)
      if (!String(txHash ?? '').startsWith('0x')) {
        throw new Error('Circle did not return the Arc transaction hash for this Gateway withdrawal.')
      }

      const explorerUrl = result?.explorerUrl ?? `${ARC_EXPLORER_URL}/tx/${txHash}`
      const transfer = await getGatewayWithdrawalTransfer(txHash, recipientAddress)

      await Promise.all([
        createPaymentRecord({
          pageUsername: page.username,
          payerAddress: gatewayWallet.walletAddress,
          recipientAddress,
          amount,
          sourceChain: 'Gateway unified balance',
          destinationChain: 'Arc Testnet',
          txHash,
          explorerUrl,
          status: 'confirmed',
          kind: 'outgoing',
          note: 'Gateway withdrawal'
        }),
        upsertWalletActivityRecords([{
          pageId: page.id,
          ownerId: page.ownerId,
          pageUsername: page.username,
          walletAddress: gatewayWallet.walletAddress,
          fromAddress: transfer?.fromAddress ?? null,
          toAddress: transfer?.toAddress ?? recipientAddress,
          amount,
          asset: 'USDC',
          chain: 'Arc Testnet',
          txHash,
          explorerUrl,
          source: 'Gateway withdrawal',
          blockNumber: transfer?.blockNumber ?? result?.blockNumber ?? null,
          happenedAt: transfer?.happenedAt
        }])
      ])

      return NextResponse.json({ result, source, gatewayWallet })
    }

    return NextResponse.json({ error: 'Unsupported Unified Balance action.' }, { status: 400 })
  } catch (error) {
    const source = getSourceChain(body?.sourceChainId)
    logServerError(`Unified Balance ${body?.action ?? 'request'}`, error)
    return NextResponse.json({
      error: getSafeApiError(error, {
        operation: body?.action === 'deposit' ? 'gateway-deposit' : 'gateway-action',
        chainLabel: source.label,
        nativeSymbol: source.nativeSymbol
      })
    }, { status: 500 })
  }
}
