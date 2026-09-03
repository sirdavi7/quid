import { NextResponse } from 'next/server'
import { sendArcUsdcFromCircleWallet } from '@/lib/circleWallets'
import { createPaymentRecord, getPageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateAddress, validateAmount } from '@/lib/validation'

export async function POST(request) {
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

    if (!validateAddress(recipientAddress) || !validateAmount(amount)) {
      return NextResponse.json({ error: 'Valid recipient and amount are required.' }, { status: 400 })
    }

    const result = await sendArcUsdcFromCircleWallet({
      walletId: page.walletId,
      recipientAddress,
      amount
    })

    const txHash = result?.transactionHash ?? result?.hash ?? result?.txHash ?? result?.id
    const explorerUrl = result?.explorerUrl ?? (String(txHash ?? '').startsWith('0x') ? `https://testnet.arcscan.app/tx/${txHash}` : null)

    await createPaymentRecord({
      pageUsername: page.username,
      payerAddress: page.walletAddress,
      recipientAddress,
      amount,
      sourceChain: 'Arc Testnet',
      destinationChain: 'Arc Testnet',
      txHash,
      explorerUrl,
      status: explorerUrl ? 'confirmed' : 'submitted',
      kind: 'outgoing',
      note: 'Direct withdrawal'
    })

    return NextResponse.json({ result, explorerUrl })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Payout request failed.' }, { status: 500 })
  }
}
