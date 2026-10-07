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
      const feeLines = [
        formatFeeLine('Approval', fees.approval, source.nativeSymbol),
        formatFeeLine('Gateway deposit', fees.deposit, source.nativeSymbol)
      ].filter(Boolean)

      if (!feeLines.length) {
        throw new Error('Circle did not return a live network fee quote for this Gateway deposit.')
      }

      return NextResponse.json({
        network: source.label,
        gasAsset: source.nativeSymbol,
        feeLines,
        detail: source.id === chainOptions[0].id
          ? 'Arc uses USDC for both network fees and the deposit amount.'
          : `${source.nativeSymbol} is required to pay the two network transactions for this Gateway deposit.`
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

      return NextResponse.json({
        network: 'Arc Testnet',
        gasAsset: 'USDC',
        feeLines: [formatFeeLine('Network fee', fee, 'USDC')].filter(Boolean),
        detail: 'Arc uses USDC for network gas. The fee is separate from the withdrawal amount.'
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
      const feeLines = (estimate?.fees ?? [])
        .filter((fee) => fee?.amount !== undefined && fee?.token)
        .map((fee) => `${String(fee.type ?? 'Gateway fee')}: ${fee.amount} ${fee.token}`)

      return NextResponse.json({
        network: `${source.label} to ${destination.label}`,
        gasAsset: source.nativeSymbol,
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
