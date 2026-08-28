import { NextResponse } from 'next/server'
import { isAddress } from 'viem'
import { createPaymentRecord, getPage } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const amount = Number(body.amount)

    if (!body.pageUsername) {
      return NextResponse.json({ error: 'Quid page username is required.' }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter a valid USDC amount.' }, { status: 400 })
    }

    if (body.payerAddress && !isAddress(body.payerAddress)) {
      return NextResponse.json({ error: 'Payer address is not valid.' }, { status: 400 })
    }

    const kind = body.kind === 'outgoing' ? 'outgoing' : 'incoming'

    if (kind === 'outgoing') {
      if (!body.recipientAddress || !isAddress(body.recipientAddress)) {
        return NextResponse.json({ error: 'Recipient address is not valid.' }, { status: 400 })
      }

      const supabase = createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      const page = await getPage(body.pageUsername)

      if (!data.user || !page || page.ownerId !== data.user.id) {
        return NextResponse.json({ error: 'Only the page owner can record outgoing transfers.' }, { status: 403 })
      }
    }

    const payment = await createPaymentRecord({
      pageUsername: body.pageUsername,
      payerAddress: body.payerAddress,
      recipientAddress: kind === 'outgoing' ? body.recipientAddress : undefined,
      amount,
      sourceChain: body.sourceChain,
      destinationChain: 'Arc Testnet',
      txHash: body.txHash,
      explorerUrl: body.explorerUrl,
      status: 'submitted',
      kind,
      note: body.note
    })

    return NextResponse.json({ payment })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
