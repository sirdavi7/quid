import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { AppFooterStrip } from '@/components/app-footer-strip'
import { notFound } from 'next/navigation'
import { Eye, Settings, WalletCards } from 'lucide-react'
import { CreatorWalletPanel } from '@/components/creator-wallet-panel'
import { PayActions } from '@/components/pay-actions'
import { CopyAddressButton } from '@/components/copy-address-button'
import { ReceiveCard } from '@/components/receive-card'
import { ScanPayCard } from '@/components/scan-pay-card'
import { CreateNavButton, DashboardNavButton, FaucetNavButton, HomeNavButton, SignOutNavButton } from '@/components/nav-buttons'
import { getPage, listWalletsForPage } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }) {
  const page = await getPage(params.username)

  if (!page) {
    return {
      title: 'Payment Page'
    }
  }

  return {
    title: `Pay ${page.name}`,
    description: page.note || `Send USDC to ${page.name} with Quid.`,
    openGraph: {
      title: `Pay ${page.name} with Quid`,
      description: page.note || page.headline
    }
  }
}

export default async function PayPage({ params, searchParams }) {
  const page = await getPage(params.username)

  if (!page) {
    notFound()
  }

  let user = null

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const isOwner = user?.id === page.ownerId
  const pageWallets = isOwner ? await listWalletsForPage(page.id) : []
  const publicPage = {
    name: page.name,
    username: page.username,
    headline: page.headline,
    note: page.note,
    walletAddress: page.walletAddress,
    walletBlockchain: page.walletBlockchain,
    walletMocked: page.walletMocked
  }

  return (
    <>
      <main className="min-h-screen bg-paper">
        <AppHeader>
          <HomeNavButton />
          {user ? <DashboardNavButton /> : <CreateNavButton label="Create yours" />}
          {user ? <SignOutNavButton /> : null}
          <FaucetNavButton />
        </AppHeader>

        {isOwner ? (
          <section className="mx-auto max-w-6xl px-5 pt-8 sm:pt-10">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-arc/20 bg-haze px-4 py-3 text-sm text-ink shadow-panel">
              <div className="flex items-center gap-2 font-semibold">
                <Eye size={16} className="text-arc" />
                You are viewing your public payment page as the owner.
              </div>
              <Link href="/settings" className="inline-flex h-9 items-center gap-2 rounded-md bg-arc px-3 text-xs font-bold text-white shadow-glow">
                <Settings size={14} /> Edit page details
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-8 pt-8 xl:grid-cols-[0.9fr_1.1fr]">
          <aside className="order-2 rounded-lg border border-ink/10 bg-white p-5 shadow-panel xl:order-1">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-md bg-arc text-2xl font-black text-white">
                {page.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-ink">{page.name}</h1>
                <p className="text-sm font-semibold text-ink/50">@{page.username}</p>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-arc/20 bg-haze p-4 text-ink">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-arc">{page.headline}</p>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{page.note || 'USDC payments accepted on Arc Testnet.'}</p>
                </div>
                {isOwner ? (
                  <Link href="/settings" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-arc/20 bg-white px-2 py-1 text-xs font-bold text-arc">
                    <Settings size={13} /> Edit
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-md border border-ink/10 bg-paper p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink/60">
                <WalletCards size={17} /> Arc recipient
              </div>
              <p className="mt-2 break-all font-mono text-sm text-ink">{page.walletAddress}</p>
              <CopyAddressButton
                address={page.walletAddress}
                label={page.walletMocked ? 'Demo wallet address' : 'Circle wallet address'}
              />
            </div>
          </aside>

          <div className="order-1 xl:order-2">
            <PayActions
              page={publicPage}
              isOwner={isOwner}
              initialAmount={searchParams?.amount}
              initialChain={searchParams?.chain}
            />
          </div>
        </section>
        {isOwner ? (
          <section className="mx-auto max-w-6xl px-5 pb-8">
            <ScanPayCard />
          </section>
        ) : null}
        {isOwner ? (
          <section className="mx-auto max-w-6xl px-5 pb-8">
            <ReceiveCard page={publicPage} />
          </section>
        ) : null}
        {isOwner ? <CreatorWalletPanel page={{ ...page, wallets: pageWallets }} /> : null}
      </main>
      <AppFooterStrip />
    </>
  )
}
