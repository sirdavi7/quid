import { NextResponse } from 'next/server'
import { ARC_TESTNET_CHAIN } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'
import { depositCircleWalletUsdcToGateway } from '@/lib/circleWallets'
import { createPaymentRecord, getPageForOwner, getWalletForPageChain } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createCircleWalletsUnifiedAdapter, createServerUnifiedBalanceKit } from '@/lib/unifiedBalance'
import { validateAddress, validateAmount } from '@/lib/validation'

function getSourceChain(chainId) {
  return chainOptions.find((option) => option.id === Number(chainId)) ?? chainOptions[0]
}

function getResultHash(result) {
  return result?.txHash ?? result?.transactionHash ?? result?.hash ?? result?.transferId
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

export async function POST(request) {
  try {
    const body = await request.json()
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
      const adapter = createCircleWalletsUnifiedAdapter()
      const balances = await withRpcRetry(() => kit.getBalances({
        sources: { adapter, address: sourceAddress },
        networkType: 'testnet'
      }))
      return NextResponse.json({ balances })
    }

    if (action === 'deposit') {
      if (!validateAmount(amount)) {
        return NextResponse.json({ error: 'A valid amount is required.' }, { status: 400 })
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

      return NextResponse.json({ result, source })
    }

    if (action === 'send') {
      const kit = createServerUnifiedBalanceKit()
      const adapter = createCircleWalletsUnifiedAdapter()
      const recipientAddress = String(body.recipientAddress ?? '')
      if (!validateAddress(recipientAddress) || !validateAmount(amount)) {
        return NextResponse.json({ error: 'Valid recipient and amount are required.' }, { status: 400 })
      }

      const result = await kit.spend({
        from: {
          adapter,
          address: sourceAddress,
          allocations: { amount, chain: source.gatewayName }
        },
        to: {
          chain: ARC_TESTNET_CHAIN,
          recipientAddress,
          useForwarder: true
        },
        amount
      })

      const txHash = getResultHash(result)
      await createPaymentRecord({
        pageUsername: page.username,
        payerAddress: sourceAddress,
        recipientAddress,
        amount,
        sourceChain: source.label,
        destinationChain: 'Arc Testnet',
        txHash,
        explorerUrl: result?.explorerUrl ?? null,
        status: 'submitted',
        kind: 'outgoing',
        note: 'Gateway withdrawal'
      })

      return NextResponse.json({ result, source })
    }

    return NextResponse.json({ error: 'Unsupported Unified Balance action.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Unified Balance request failed.' }, { status: 500 })
  }
}
