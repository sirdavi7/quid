import { NextResponse } from 'next/server'
import { ARC_TESTNET_ID } from '@/lib/arc'
import { sendArcUsdcFromCircleWallet } from '@/lib/circleWallets'
import { createNativeGasEvidence } from '@/lib/payment-fee-evidence'
import { createPaymentRecord, getPageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOnchainActionBlockMessage } from '@/lib/runtime-network'
import { validateAddress, validateAmount } from '@/lib/validation'
import { getSafeApiError, logServerError } from '@/lib/user-errors'

export async function POST(request) {
  const networkBlockMessage = getOnchainActionBlockMessage()

  if (networkBlockMessage) {
    return NextResponse.json({ error: networkBlockMessage }, { status: 503 })
  }

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to withdraw from this Quid page.' }, { status: 401 })
    }

    const page = await getPageForOwner(data.user.id)

    if (!page) {
      return NextResponse.json({ error: 'Create a Quid page before withdrawing.' }, { status: 404 })
    }

    if (page.walletMocked || !page.walletId) {
      return NextResponse.json({ error: 'This Quid page does not have a live Circle wallet yet.' }, { status: 400 })
    }

    const body = await request.json()
    const recipientAddress = String(body.recipientAddress ?? '')
    const amount = String(body.amount ?? '')

    if (!validateAddress(recipientAddress)) {
      return NextResponse.json({ error: 'Enter a valid recipient address before withdrawing USDC.' }, { status: 400 })
    }
    if (!validateAmount(amount)) {
      return NextResponse.json({ error: 'Enter a valid USDC amount before withdrawing.' }, { status: 400 })
    }

    const result = await sendArcUsdcFromCircleWallet({
      walletId: page.walletId,
      recipientAddress,
      amount
    })

    const txHash = result?.transactionHash ?? result?.hash ?? result?.txHash ?? null
    const explorerUrl = result?.explorerUrl ?? (String(txHash ?? '').startsWith('0x') ? `https://testnet.arcscan.app/tx/${txHash}` : null)

    const payment = await createPaymentRecord({
      pageUsername: page.username,
      payerAddress: page.walletAddress,
      recipientAddress,
      amount,
      sourceChain: 'Arc Testnet',
      destinationChain: 'Arc Testnet',
      txHash,
      explorerUrl,
      circleTransactionId: result?.id ?? null,
      circleState: result?.state ?? 'INITIATED',
      feeEvidence: [createNativeGasEvidence({
        label: 'Direct withdrawal',
        transaction: result,
        chainId: ARC_TESTNET_ID,
        asset: 'USDC'
      })],
      status: 'submitted',
      kind: 'outgoing',
      operation: 'direct-withdrawal',
      note: 'Direct withdrawal'
    })

    return NextResponse.json({ result, explorerUrl, payment })
  } catch (error) {
    logServerError('Arc withdrawal', error)
    return NextResponse.json({ error: getSafeApiError(error, { fallback: 'We could not submit this Arc withdrawal. Check the recipient and wallet balance, then try again.' }) }, { status: 500 })
  }
}
