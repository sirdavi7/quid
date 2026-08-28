import { NextResponse } from 'next/server'
import { createQuidWalletForChain } from '@/lib/circleWallets'
import { chainOptions } from '@/lib/chains'
import { getPageForOwner, listWalletsForPage, upsertPageWalletRecords } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function toWalletRecord(page, wallet) {
  return {
    pageId: page.id,
    ownerId: page.ownerId,
    pageUsername: page.username,
    walletId: wallet.id,
    walletAddress: wallet.address,
    walletBlockchain: wallet.blockchain,
    walletAccountType: wallet.accountType,
    chainId: wallet.chainId,
    chainLabel: wallet.chainLabel,
    gatewayName: wallet.gatewayName,
    usdcAddress: wallet.usdcAddress,
    mocked: wallet.mocked
  }
}

function toExistingArcWalletRecord(page) {
  const arcChain = chainOptions[0]

  return {
    pageId: page.id,
    ownerId: page.ownerId,
    pageUsername: page.username,
    walletId: page.walletId,
    walletAddress: page.walletAddress,
    walletBlockchain: page.walletBlockchain,
    walletAccountType: page.walletAccountType,
    chainId: arcChain.id,
    chainLabel: arcChain.label,
    gatewayName: arcChain.gatewayName,
    usdcAddress: arcChain.usdcAddress,
    mocked: page.walletMocked
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to view page wallets.' }, { status: 401 })
    }

    const page = await getPageForOwner(data.user.id)

    if (!page) {
      return NextResponse.json({ wallets: [] })
    }

    const wallets = await listWalletsForPage(page.id)
    return NextResponse.json({ wallets })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to load page wallets.' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to create page wallets.' }, { status: 401 })
    }

    const page = await getPageForOwner(data.user.id)

    if (!page) {
      return NextResponse.json({ error: 'Create a Quid page first.' }, { status: 404 })
    }

    const existing = await listWalletsForPage(page.id)
    const recordsToSave = []
    const existingChainIds = new Set(existing.map((wallet) => wallet.chainId))
    const arcChain = chainOptions[0]

    if (page.walletAddress && !existingChainIds.has(arcChain.id)) {
      recordsToSave.push(toExistingArcWalletRecord(page))
      existingChainIds.add(arcChain.id)
    }

    const missingChains = chainOptions.filter((chain) => !existingChainIds.has(chain.id))
    const created = []

    for (const chain of missingChains) {
      const wallet = await createQuidWalletForChain(chain)
      created.push(toWalletRecord(page, wallet))
    }

    recordsToSave.push(...created)

    await upsertPageWalletRecords(recordsToSave)
    const wallets = await listWalletsForPage(page.id)

    return NextResponse.json({
      created: created.length,
      wallets
    })
  } catch (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to create page wallets.' }, { status: 500 })
  }
}
