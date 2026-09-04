import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { redirect } from 'next/navigation'
import { Activity, Clock3, Droplets, ExternalLink, Plus, ReceiptText, Settings, WalletCards } from 'lucide-react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { DashboardChainWallets } from '@/components/dashboard-chain-wallets'
import { DashboardReceivedBalance } from '@/components/dashboard-received-balance'
import { DashboardWalletActivity } from '@/components/dashboard-wallet-activity'
import { FaucetNavButton, HomeNavButton, OpenPaymentPageNavButton, CreateNavButton, SignOutNavButton } from '@/components/nav-buttons'
import { getPaymentSummaryForOwner, listPagesForOwner, listPaymentsForOwner, listWalletActivityForOwner, listWalletsForPage, updatePaymentExplorerForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCircleTransactionDetails } from '@/lib/circleWallets'

export const metadata = {
  title: 'Dashboard'
}

function formatUsdc(value) {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} USDC`
}

function formatDate(value) {
  if (!value) {
    return 'No payments yet'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function shortAddress(address) {
  if (!address) {
    return 'Unknown payer'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function paymentDirection(payment) {
  return payment.kind === 'outgoing' ? '-' : '+'
}

function paymentDescription(payment) {
  if (payment.kind === 'outgoing') {
    return `From /pay/${payment.pageUsername} to ${shortAddress(payment.recipientAddress)}`
  }

  return `From ${shortAddress(payment.payerAddress)} to /pay/${payment.pageUsername}`
}

function paymentSourceLabel(payment) {
  if (payment.kind === 'outgoing') {
    return payment.note || 'Direct withdrawal'
  }

  if (payment.note && !payment.note.toLowerCase().startsWith('paid ')) {
    return payment.note
  }

  return 'Received USDC'
}

function paymentChainLabel(payment) {
  const source = payment.sourceChain || 'Arc Testnet'
  const destination = payment.destinationChain || 'Arc Testnet'

  if (source === destination) {
    return source
  }

  return `${source} to ${destination}`
}

function paymentExplorerUrl(payment) {
  if (payment.explorerUrl) {
    return payment.explorerUrl
  }

  if (String(payment.txHash ?? '').startsWith('0x') && paymentChainLabel(payment).toLowerCase().includes('arc testnet')) {
    return `https://testnet.arcscan.app/tx/${payment.txHash}`
  }

  return null
}

function paymentStatusFromCircleState(state, fallback) {
  const normalized = String(state ?? '').toUpperCase()

  if (['COMPLETE', 'CONFIRMED'].includes(normalized)) {
    return 'confirmed'
  }

  if (['FAILED', 'DENIED', 'CANCELLED'].includes(normalized)) {
    return 'failed'
  }

  return fallback ?? 'submitted'
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Circle transaction lookup timed out.')), ms)
    })
  ])
}

async function hydratePaymentExplorerLinks(ownerId, payments) {
  const unresolved = payments
    .filter((payment) => (
      payment.kind === 'outgoing' &&
      payment.txHash &&
      !paymentExplorerUrl(payment) &&
      !String(payment.txHash).startsWith('0x')
    ))
    .slice(0, 5)

  if (!unresolved.length) {
    return payments
  }

  const updates = await Promise.allSettled(
    unresolved.map(async (payment) => {
      const resolved = await withTimeout(getCircleTransactionDetails(payment.txHash), 2500)

      if (!resolved.txHash || !String(resolved.txHash).startsWith('0x')) {
        return null
      }

      const explorerUrl = resolved.explorerUrl ?? `https://testnet.arcscan.app/tx/${resolved.txHash}`
      return updatePaymentExplorerForOwner(ownerId, payment.id, {
        txHash: resolved.txHash,
        explorerUrl,
        status: paymentStatusFromCircleState(resolved.state, payment.status)
      })
    })
  )

  const byId = new Map(
    updates
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => [result.value.id, result.value])
  )

  return payments.map((payment) => byId.get(payment.id) ?? payment)
}

export default async function DashboardPage() {
  let user = null

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  const pages = await listPagesForOwner(user.id)
  const storedPayments = await listPaymentsForOwner(user.id, 20)
  const payments = await hydratePaymentExplorerLinks(user.id, storedPayments)
  const summary = await getPaymentSummaryForOwner(user.id)
  const primaryPage = pages[0]
  const pageWallets = primaryPage ? await listWalletsForPage(primaryPage.id) : []
  const walletActivities = await listWalletActivityForOwner(user.id, 30)
  const outgoingPayments = payments.filter((payment) => payment.kind === 'outgoing' && payment.status !== 'failed')
  const outgoingTotal = outgoingPayments.reduce((total, payment) => total + Number(payment.amount), 0)

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader>
        <HomeNavButton />
        {primaryPage ? <OpenPaymentPageNavButton username={primaryPage.username} /> : <CreateNavButton label="Create" />}
        <SignOutNavButton />
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-arc">Dashboard</p>
            <h1 className="mt-2 text-4xl font-black text-ink">Your Quid workspace</h1>
            <p className="mt-3 text-ink/60">{user.email}</p>
          </div>
          {!primaryPage ? (
            <Link href="/create" className="quid-primary-action h-11 px-4">
              <Plus size={18} /> Create payment page
            </Link>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {primaryPage ? (
            <DashboardReceivedBalance
              walletAddress={primaryPage.walletAddress}
              walletMocked={primaryPage.walletMocked}
            />
          ) : null}
          <div className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase text-ink/50">Checkout USDC</p>
              <ReceiptText size={18} className="text-arc" />
            </div>
            <p className="mt-4 text-3xl font-black text-ink">{formatUsdc(summary.totalReceived)}</p>
            <p className="mt-2 text-sm text-ink/55">Total submitted through Quid checkout.</p>
          </div>
          <div className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase text-ink/50">Checkout records</p>
              <Activity size={18} className="text-arc" />
            </div>
            <p className="mt-4 text-3xl font-black text-ink">{summary.paymentCount}</p>
            <p className="mt-2 text-sm text-ink/55">Number of Quid checkout submissions.</p>
          </div>
          <div className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase text-ink/50">Withdrawn USDC</p>
              <ExternalLink size={18} className="text-arc" />
            </div>
            <p className="mt-4 text-3xl font-black text-ink">{formatUsdc(outgoingTotal)}</p>
            <p className="mt-2 text-sm text-ink/55">USDC sent out from Quid owner tools.</p>
          </div>
          <div className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase text-ink/50">Latest checkout</p>
              <Clock3 size={18} className="text-arc" />
            </div>
            <p className="mt-4 text-2xl font-black text-ink">{formatDate(summary.latestPaymentAt)}</p>
            <p className="mt-2 text-sm text-ink/55">Most recent Quid checkout record.</p>
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-arc/20 bg-haze p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-arc text-white shadow-glow">
                <Droplets size={20} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-arc">Testnet faucet</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Need USDC to test Quid?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
                  Use Circle's faucet to fund your connected wallet with test USDC before trying Arc payments, payouts, or Gateway flows.
                </p>
              </div>
            </div>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="quid-secondary-action h-11 px-4"
            >
              Open faucet <ExternalLink size={16} />
            </a>
          </div>
        </section>

        {primaryPage ? (
          <div className="mt-6">
            <DashboardChainWallets
              initialWallets={pageWallets}
              page={primaryPage}
              walletMocked={primaryPage.walletMocked}
            />
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-ink">Payment page</h2>
              {!primaryPage ? null : <CopyLinkButton path={`/pay/${primaryPage.username}`} />}
            </div>

            {pages.length ? (
              <div className="mt-4 grid gap-4">
                {pages.map((page) => (
                  <article key={page.username} className="quid-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-md bg-arc text-lg font-black text-white">
                            {page.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-ink">{page.name}</h3>
                            <p className="text-sm font-semibold text-ink/50">/pay/{page.username}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-ink/60">{page.headline}</p>
                        <p className="mt-3 break-all font-mono text-xs text-ink/55">{page.walletAddress}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href="/settings" className="quid-secondary-action">
                          <Settings size={16} /> Edit
                        </Link>
                        <Link href={`/pay/${page.username}`} className="quid-primary-action">
                          <ExternalLink size={16} /> Open
                        </Link>
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-xs font-bold text-ink/60">
                      <WalletCards size={15} /> {page.walletMocked ? 'Demo wallet' : 'Circle wallet'}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="quid-card mt-4 p-6">
                <h3 className="text-2xl font-black text-ink">No payment page yet</h3>
                <p className="mt-2 text-ink/60">Create your first Quid link to start receiving USDC.</p>
                <Link href="/create" className="quid-primary-action mt-5 h-11 px-4">
                  <Plus size={18} /> Create page
                </Link>
              </div>
            )}
          </section>

          <section className="quid-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-arc">Activity</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Quid money movement</h2>
              </div>
              <ReceiptText className="text-arc" />
            </div>

            {payments.length ? (
              <div className="mt-5 max-h-[30rem] divide-y divide-ink/10 overflow-y-auto pr-1">
                {payments.map((payment) => (
                  <article key={payment.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="min-w-0">
                        <p className="font-black text-ink">{paymentDirection(payment)}{formatUsdc(payment.amount)}</p>
                        <p className="mt-1 text-sm text-ink/55">
                          {paymentDescription(payment)}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase text-ink/40">
                          {formatDate(payment.createdAt)} - {paymentChainLabel(payment)} - {paymentSourceLabel(payment)}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-mint/20 px-2 py-1 text-xs font-bold uppercase text-ink">
                          {payment.status}
                        </span>
                        {paymentExplorerUrl(payment) ? (
                          <a href={paymentExplorerUrl(payment)} target="_blank" rel="noreferrer" className="quid-secondary-action h-8 gap-1 px-2 text-xs">
                            Explorer <ExternalLink size={13} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-arc/25 bg-haze/70 p-5">
                <h3 className="font-black text-ink">No payments recorded yet</h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Quid checkout payments and owner withdrawals will appear here with amount, wallet, chain, and receipt links.
                </p>
              </div>
            )}
          </section>
        </div>

        {primaryPage ? (
          <div className="mt-6">
            <DashboardWalletActivity
              initialActivities={walletActivities}
              walletMocked={primaryPage.walletMocked}
            />
          </div>
        ) : null}
      </section>
    </main>
  )
}
