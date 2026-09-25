import { NextResponse } from 'next/server'
import { createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem'
import { ARC_EXPLORER_URL, ARC_TESTNET_CHAIN, ARC_USDC_ADDRESS, arcTestnet } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'
import { GATEWAY_WALLET_EVM_TESTNET, depositCircleWalletUsdcToGateway } from '@/lib/circleWallets'
import { createPaymentRecord, getPageForOwner, getWalletForPageChain, listWalletsForPage, upsertWalletActivityRecords } from '@/lib/store'
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

function getGatewayBalanceWallets(page, wallets) {
  const byAddress = new Map()

  const records = [...wallets]
  const arcChain = chainOptions[0]

  if (page.walletAddress && !records.some((wallet) => normalizeAddress(wallet.walletAddress) === normalizeAddress(page.walletAddress))) {
    records.unshift({
      walletAddress: page.walletAddress,
      chainLabel: arcChain.label
    })
  }

  for (const wallet of records) {
    const address = String(wallet.walletAddress ?? '')
    if (!address) {
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

    if (action === 'balances') {
      const kit = createServerUnifiedBalanceKit()
      const pageWallets = await listWalletsForPage(page.id)
      const balanceWallets = getGatewayBalanceWallets(page, pageWallets)
      const results = await Promise.allSettled(
        balanceWallets.map(async (wallet) => ({
          ...wallet,
          balances: await withRpcRetry(() => kit.getBalances({
            sources: { address: wallet.walletAddress },
            networkType: 'testnet'
          }))
        }))
      )
      const walletBalances = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)

      return NextResponse.json({ walletBalances })
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

      const result = await depositCircleWalletUsdcToGateway({
        walletId: sourceWallet.walletId,
        chainId: source.id,
        usdcAddress: source.usdcAddress,
        amount
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

      return NextResponse.json({ result, source, payment: recordResults[0].status === 'fulfilled' ? recordResults[0].value : null })
    }

    if (action === 'send') {
      const kit = createServerUnifiedBalanceKit()
      const adapter = createCircleWalletsUnifiedAdapter()
      const recipientAddress = String(body.recipientAddress ?? '')
      const destination = chainOptions.find((option) => option.id === Number(body.destinationChainId))

      if (!destination?.gatewayName) {
        return NextResponse.json({ error: 'Choose a supported destination chain before withdrawing Gateway USDC.' }, { status: 400 })
      }

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
          address: sourceAddress,
          allocations: { amount, chain: source.gatewayName }
        },
        to: {
          chain: destination.gatewayName,
          recipientAddress,
          useForwarder: true
        },
        amount
      })

      const txHash = getResultHash(result)
      if (!String(txHash ?? '').startsWith('0x')) {
        throw new Error('Circle did not return the destination transaction hash for this Gateway withdrawal.')
      }

      const explorerUrl = result?.explorerUrl ?? (destination.gatewayName === ARC_TESTNET_CHAIN ? `${ARC_EXPLORER_URL}/tx/${txHash}` : null)
      const transfer = destination.gatewayName === ARC_TESTNET_CHAIN
        ? await getGatewayWithdrawalTransfer(txHash, recipientAddress)
        : null

      await Promise.all([
        createPaymentRecord({
          pageUsername: page.username,
          payerAddress: sourceAddress,
          recipientAddress,
          amount,
          sourceChain: source.label,
          destinationChain: destination.label,
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
          walletAddress: sourceAddress,
          fromAddress: transfer?.fromAddress ?? null,
          toAddress: transfer?.toAddress ?? recipientAddress,
          amount,
          asset: 'USDC',
          chain: destination.label,
          txHash,
          explorerUrl,
          source: `Gateway withdrawal from ${source.label} to ${destination.label}`,
          blockNumber: transfer?.blockNumber ?? result?.blockNumber ?? null,
          happenedAt: transfer?.happenedAt
        }])
      ])

      return NextResponse.json({ result, source })
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
