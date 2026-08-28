import { NextResponse } from 'next/server'
import { createQuidWallets } from '@/lib/circleWallets'
import { createPage, getPageForOwner, upsertPageWalletRecords } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeUsername, validateUsername } from '@/lib/validation'

export async function GET() {
  return NextResponse.json({ error: 'Page directory is not public.' }, { status: 405 })
}

export async function POST(request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to create a Quid page.' }, { status: 401 })
    }

    const existingPage = await getPageForOwner(data.user.id)

    if (existingPage) {
      return NextResponse.json(
        { error: 'This account already has a Quid page.', page: existingPage },
        { status: 409 }
      )
    }

    const body = await request.json()
    const username = normalizeUsername(body.username)

    if (!body.name || !body.headline || !validateUsername(username)) {
      return NextResponse.json(
        { error: 'Name, headline, and a 3-24 character username are required.' },
        { status: 400 }
      )
    }

    const wallets = await createQuidWallets()
    const wallet = wallets.find((item) => item.circleBlockchain === 'ARC-TESTNET') ?? wallets[0]
    const page = await createPage({
      name: String(body.name).trim(),
      username,
      headline: String(body.headline).trim(),
      note: String(body.note ?? '').trim(),
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletBlockchain: wallet.blockchain,
      walletAccountType: wallet.accountType,
      walletMocked: wallet.mocked,
      ownerId: data.user.id,
      ownerEmail: data.user.email
    })

    await upsertPageWalletRecords(wallets.map((item) => ({
      pageId: page.id,
      ownerId: page.ownerId,
      pageUsername: page.username,
      walletId: item.id,
      walletAddress: item.address,
      walletBlockchain: item.blockchain,
      walletAccountType: item.accountType,
      chainId: item.chainId,
      chainLabel: item.chainLabel,
      gatewayName: item.gatewayName,
      usdcAddress: item.usdcAddress,
      mocked: item.mocked
    })))

    return NextResponse.json({ page }, { status: 201 })
  } catch (error) {
    const status = error.message?.includes('Username already') ? 409 : 500
    return NextResponse.json({ error: error.message ?? 'Unable to create page.' }, { status })
  }
}
