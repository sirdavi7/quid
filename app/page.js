import Link from 'next/link'
import { ArrowRight, BadgeCheck, BadgeDollarSign, CircleHelp, Link2, ReceiptText, ScanLine, Send, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import Image from 'next/image'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { HomeShowcase } from '@/components/home-showcase'
import { ScrollReveal } from '@/components/scroll-reveal'
import { CreateNavButton, FaucetNavButton, HomeNavButton, DashboardNavButton, LoginNavButton, SignOutNavButton } from '@/components/nav-buttons'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPageForOwner } from '@/lib/store'

export default async function Home() {
  let user = null

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const primaryPage = user ? await getPageForOwner(user.id) : null
  const paymentPageHref = user ? (primaryPage?.username ? `/pay/${primaryPage.username}` : '/create') : '/dashboard'

  const productCards = [
    {
      icon: Link2,
      title: 'Public pay pages',
      body: 'Create one Quid page with your handle, payment note, QR receive card, and clean checkout flow.'
    },
    {
      icon: WalletCards,
      title: 'Connected wallet checkout',
      body: 'Payers connect a browser wallet, choose a source chain, and send USDC without learning your wallet setup.'
    },
    {
      icon: ScanLine,
      title: 'Scan and pay',
      body: 'Owners can scan a Quid QR, upload a QR image, or paste a pay link when a payment starts somewhere else.'
    },
    {
      icon: ReceiptText,
      title: 'Readable money movement',
      body: 'Checkout payments, direct deposits, owner sends, balance detects, and withdrawals speak one transaction language.'
    },
    {
      icon: Send,
      title: 'Arc withdrawals',
      body: 'Move received USDC from the Circle-backed page wallet to your chosen Arc recipient with explorer proof.'
    },
    {
      icon: BadgeDollarSign,
      title: 'Balance clarity',
      body: 'Show selected-chain USDC, Arc received balance, checkout totals, withdrawal totals, and Gateway context.'
    },
    {
      icon: ShieldCheck,
      title: 'Circle and Arc rails',
      body: 'Built around Circle Wallets, Arc Testnet USDC, ArcScan verification, and Gateway-aware payment flows.'
    }
  ]

  const reasons = [
    ['Simple for payers', 'Visitors see who they are paying, choose an amount, connect a wallet, and get a receipt path.'],
    ['Clear for creators', 'Dashboard totals, supported-chain wallets, checkout records, and payout controls stay behind your account.'],
    ['Built for trust', 'Owner-only actions, readable transaction labels, and explorer links make money movement easier to verify.']
  ]

  const faqs = [
    ['Is Quid only for me paying myself?', 'No. Your public /pay page is what other people use to pay you. The owner preview lets you test that same flow safely.'],
    ['Where does received USDC go?', 'Payments land in the Circle-backed Arc wallet attached to your Quid page, then you can withdraw to your recipient address.'],
    ['Why does Gateway balance look separate?', "Gateway is Circle's unified cross-chain balance layer. Your Arc received wallet can hold USDC even when Gateway balance is zero."],
    ['Is this mainnet yet?', 'This build is focused on Arc Testnet and launch-readiness work. Mainnet readiness needs compliance, production keys, monitoring, and security review.']
  ]

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper">
      <AppHeader includeSite>
        <HomeNavButton />
        {user ? (
          <>
            <DashboardNavButton />
            <SignOutNavButton />
          </>
        ) : (
          <>
            <LoginNavButton />
            <CreateNavButton />
          </>
        )}
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-5 sm:pt-20 lg:pt-24">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex max-w-full rounded-md border border-arc/20 bg-haze px-3 py-2 text-sm font-bold leading-5 text-arc">
            Arc Testnet, Circle Wallets, Gateway
          </p>
          <h1 className="text-4xl font-black leading-[1.04] text-ink sm:text-5xl lg:text-6xl">
            Your USDC payment workspace.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70 lg:text-xl">
            Quid gives you one public pay page, connected-wallet checkout, QR scan and pay, readable receipts, and owner controls for received USDC.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['01', 'Create a pay page'],
            ['02', 'Receive by link or QR'],
            ['03', 'Track every movement'],
            ['04', 'Withdraw on Arc']
          ].map(([step, label]) => (
            <div key={step} className="rounded-md border border-arc/20 bg-white px-4 py-4 shadow-panel">
              <p className="text-xs font-black text-arc">{step}</p>
              <p className="mt-2 text-sm font-black text-ink">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={user ? '/dashboard' : '/create'}
            className="quid-primary-action h-12 w-full px-5 sm:w-auto"
          >
            {user ? 'Go to Dashboard' : 'Create your Quid page'} <ArrowRight size={18} />
          </Link>
          <Link
            href={user ? paymentPageHref : '/create'}
            className="quid-secondary-action h-12 w-full px-5 sm:w-auto"
          >
            {user ? 'Open payment page' : 'Create pay link'}
          </Link>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="quid-secondary-action h-12 w-full px-5 sm:w-auto"
          >
            Get test USDC
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5">
        <HomeShowcase />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-8 pb-16 md:grid-cols-3 lg:pt-10">
        {[
          ['Pay links that feel complete', 'Each public page carries the recipient, amount flow, chain choice, receive QR, and proof path.'],
          ['Owner controls stay protected', 'Balances, dashboard records, scan tools, and withdrawals remain account-only.'],
          ['Transactions speak clearly', 'Activity is written with amount, route, chain, status, and explorer access where available.']
        ].map(([title, body]) => (
          <ScrollReveal key={title}>
            <article className="h-full rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
              <Sparkles size={20} className="text-mint" />
              <h2 className="mt-4 text-xl font-black text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">{body}</p>
            </article>
          </ScrollReveal>
        ))}
      </section>

      <section id="product" className="mx-auto max-w-6xl px-5 pb-16">
        <ScrollReveal>
          <p className="text-xs font-black uppercase text-arc">Product</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-ink md:text-4xl">One page. A full USDC workflow.</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/60">
            Quid turns pay links, QR receiving, wallet checkout, balance checks, receipts, and Arc withdrawals into one calm workspace.
          </p>
        </ScrollReveal>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {productCards.map((card) => {
            const Icon = card.icon
            return (
              <ScrollReveal key={card.title}>
                <article className="h-full rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-haze text-arc">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-ink">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/60">{card.body}</p>
                </article>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section id="why-quid" className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 lg:grid-cols-[0.85fr_1.15fr]">
        <ScrollReveal>
          <p className="text-xs font-black uppercase text-arc">Why Quid</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-ink md:text-4xl">A pay page that explains the money.</h2>
          <p className="mt-4 text-lg leading-8 text-ink/60">
            The interface stays calm while the payment flow remains explicit: who is paying, where USDC lands, what chain it used, and how the owner moves funds.
          </p>
        </ScrollReveal>

        <div className="grid gap-4">
          {reasons.map(([title, body]) => (
            <ScrollReveal key={title}>
              <article className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-haze text-arc">
                    <BadgeCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-ink">{title}</h3>
                    <p className="mt-2 leading-7 text-ink/60">{body}</p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-5 pb-16">
        <ScrollReveal>
          <p className="text-xs font-black uppercase text-arc">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-ink md:text-4xl">Quid, plainly explained.</h2>
        </ScrollReveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <ScrollReveal key={question}>
              <article className="h-full rounded-lg border border-arc/20 bg-white p-5 shadow-panel">
                <CircleHelp className="text-arc" size={20} />
                <h3 className="mt-4 text-lg font-black text-ink">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">{answer}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-lg border border-arc/25 bg-gradient-to-r from-arc/90 via-violet/80 to-arc/75 p-7 text-white shadow-glow md:p-10">
            <Image
              src="/brand/quid-q.png"
              alt=""
              width={360}
              height={360}
              className="pointer-events-none absolute -right-16 -top-24 w-72 opacity-20 md:w-96"
            />
            <div className="relative max-w-2xl">
              <p className="text-xs font-black uppercase text-white/50">Get started</p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">Launch a USDC payment page people understand.</h2>
              <p className="mt-3 text-lg leading-8 text-white/75">
                Create your Quid link, test the payment flow, scan or share payment QR codes, and move received USDC with owner-only wallet controls.
              </p>
              <Link
                href={user ? '/dashboard' : '/create'}
                className="quid-secondary-action mt-7 h-12 border-white/60 bg-white px-5 text-arc"
              >
                {user ? 'Open dashboard' : 'Create your Quid page'} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
      <AppFooter paymentPageHref={paymentPageHref} />
    </main>
  )
}
