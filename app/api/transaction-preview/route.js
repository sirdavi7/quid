import { NextResponse } from 'next/server'
import { chainOptions } from '@/lib/chains'
import {
  estimateCircleWalletGatewayDepositFees,
  estimateCircleWalletUsdcTransferFee
} from '@/lib/circleWallets'
import { getPageForOwner, getWalletForPageChain } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createCircleWalletsUnifiedAdapter, createServerUnifiedBalanceKit } from '@/lib/unifiedBalance'
import { getOnchainActionBlockMessage } from '@/lib/runtime-network'
import { getSafeApiError, logServerError } from '@/lib/user-errors'
import { validateAddress, validateAmount } from '@/lib/validation'

function getChain(chainId) {
  return chainOptions.find((option) => option.id === Number(chainId)) ?? chainOptions[0]
}

function formatFeeLine(label, amount, asset) {
  return amount === undefined || amount === null || amount === ''
    ? null
    : `${label}: ${amount} ${asset}`
}

function createFeeItem(label, amount, asset) {
  return amount === undefined || amount === null || amount === ''
    ? null
    : { label, amount: String(amount), asset }
}

function feeLinesFromItems(items) {
  return items.map((item) => formatFeeLine(item.label, item.amount, item.asset)).filter(Boolean)
}

function gatewayFeeLabel(value) {
  const rawLabel = String(value ?? '').trim()

  if (!rawLabel) {
    return 'Gateway route fee'
  }

  const readable = rawLabel
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const capitalized = `${readable.charAt(0).toUpperCase()}${readable.slice(1)}`

  return /fee/i.test(capitalized) ? capitalized : `${capitalized} fee`
}

export async function POST(request) {
  let body = null

  try {
    const blocked = getOnchainActionBlockMessage()

    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 503 })
    }

    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to preview this transaction.' }, { status: 401 })
    }

    body = await request.json()
    const action = String(body.action ?? '')
    const amount = String(body.amount ?? '')
    const source = getChain(body.sourceChainId)
    const destination = getChain(body.destinationChainId)
    const recipientAddress = String(body.recipientAddress ?? '')
    const page = await getPageForOwner(data.user.id)

    if (!page) {
      return NextResponse.json({ error: 'Create a Quid payment page before previewing transfers.' }, { status: 400 })
    }

    if (!validateAmount(amount)) {
      return NextResponse.json({ error: 'Enter a valid USDC amount to preview the network fee.' }, { status: 400 })
    }

    if (action === 'deposit') {
      if (source.gatewayDepositSupported === false) {
        return NextResponse.json({ error: `Gateway deposits are not available on ${source.label} yet.` }, { status: 400 })
      }

      const wallet = await getWalletForPageChain(page.id, source.id)

      if (!wallet?.walletId) {
        return NextResponse.json({ error: `Set up the ${source.label} receive wallet before previewing its Gateway deposit.` }, { status: 400 })
      }

      const fees = await estimateCircleWalletGatewayDepositFees({
        walletId: wallet.walletId,
        usdcAddress: source.usdcAddress,
        amount
      })
      const feeItems = [
        createFeeItem('Approval gas estimate', fees.approval, source.nativeSymbol),
        createFeeItem('Gateway deposit gas estimate', fees.deposit, source.nativeSymbol)
      ].filter(Boolean)
      const feeLines = feeLinesFromItems(feeItems)

      if (!feeLines.length) {
        throw new Error('Circle did not return a live network fee quote for this Gateway deposit.')
      }

      return NextResponse.json({
        network: source.label,
        feeMode: 'native',
        feeAsset: source.nativeSymbol,
        gasAsset: source.nativeSymbol,
        feeItems,
        feeLines,
        detail: source.id === chainOptions[0].id
          ? 'Arc uses USDC for network gas and the deposit amount. The receipt shows the final gas paid after confirmation.'
          : `These are ${source.nativeSymbol} estimates for the approval and Gateway deposit. The receipt shows the final gas paid after confirmation.`
      })
    }

    if (action === 'withdraw') {
      if (!validateAddress(recipientAddress)) {
        return NextResponse.json({ error: 'Enter a valid recipient address before previewing this withdrawal.' }, { status: 400 })
      }

      if (!page.walletId) {
        return NextResponse.json({ error: 'This Quid page does not have a live Circle wallet yet.' }, { status: 400 })
      }

      const fee = await estimateCircleWalletUsdcTransferFee({
        walletId: page.walletId,
        recipientAddress,
        amount
      })

      if (fee === undefined || fee === null || fee === '') {
        throw new Error('Circle did not return a live network fee quote for this withdrawal.')
      }

      const feeItems = [createFeeItem('Network gas estimate', fee, 'USDC')].filter(Boolean)

      return NextResponse.json({
        network: 'Arc Testnet',
        feeMode: 'native',
        feeAsset: 'USDC',
        gasAsset: 'USDC',
        feeItems,
        feeLines: feeLinesFromItems(feeItems),
        detail: 'Arc uses USDC for network gas. The receipt shows the final gas paid after confirmation.'
      })
    }

    if (action === 'send') {
      if (!validateAddress(recipientAddress)) {
        return NextResponse.json({ error: 'Enter a valid recipient address before previewing this Gateway withdrawal.' }, { status: 400 })
      }

      const wallet = await getWalletForPageChain(page.id, source.id)
      const sourceAddress = wallet?.walletAddress ?? (source.id === chainOptions[0].id ? page.walletAddress : '')

      if (!sourceAddress) {
        return NextResponse.json({ error: `Set up the ${source.label} receive wallet before previewing this Gateway withdrawal.` }, { status: 400 })
      }

      const kit = createServerUnifiedBalanceKit()
      const adapter = createCircleWalletsUnifiedAdapter()
      const estimate = await kit.estimateSpend({
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
      const feeItems = (estimate?.fees ?? [])
        .filter((fee) => fee?.amount !== undefined && fee?.token)
        .map((fee) => createFeeItem(gatewayFeeLabel(fee.type), fee.amount, fee.token))
        .filter(Boolean)
      const feeLines = feeLinesFromItems(feeItems)
      const feeAssets = [...new Set(feeItems.map((fee) => fee.asset).filter(Boolean))]

      return NextResponse.json({
        network: `${source.label} to ${destination.label}`,
        feeMode: 'gateway',
        feeAsset: feeAssets.join(' / ') || 'USDC',
        gasAsset: feeAssets.join(' / ') || 'USDC',
        feeItems,
        feeLines,
        detail: feeLines.length
          ? 'Gateway quoted these fees for the selected route before the withdrawal is submitted.'
          : 'No additional Gateway fee was quoted for the selected route.'
      })
    }

    return NextResponse.json({ error: 'Unsupported transaction preview.' }, { status: 400 })
  } catch (error) {
    logServerError(`Transaction preview ${body?.action ?? 'request'}`, error)
    return NextResponse.json({
      error: getSafeApiError(error, {
        chainLabel: getChain(body?.sourceChainId).label,
        nativeSymbol: getChain(body?.sourceChainId).nativeSymbol,
        fallback: 'Quid could not retrieve a live network fee quote right now. Try again in a moment.'
      })
    }, { status: 500 })
  }
}
