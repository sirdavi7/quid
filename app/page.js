import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleHelp,
  Link2,
  QrCode,
  ReceiptText,
  ScanLine,
  Send,
  ShieldCheck,
  WalletCards
} from 'lucide-react'

import { AppFooter } from '@/components/app-footer'
import { AppHeader } from '@/components/app-header'
import { DashboardNavMenu } from '@/components/dashboard-nav-menu'
import { HomeShowcase } from '@/components/home-showcase'
import { CreateNavButton, FaucetNavButton, HomeNavButton, LoginNavButton, SignOutNavButton } from '@/components/nav-buttons'
import { ScrollReveal } from '@/components/scroll-reveal'
import { getPageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
  const paymentPageHref = primaryPage?.username ? `/pay/${primaryPage.username}` : '/create'
  const dashboardHref = user ? '/dashboard' : '/create'

  const products = [
    {
      icon: Link2,
      eyebrow: 'Receive',
      title: 'Quid Pages',
      body: 'A public payment page with your name, link, QR code, and a clear place for USDC to arrive.',
      href: paymentPageHref,
      action: primaryPage ? 'Open payment page' : 'Create a Quid page'
    },
    {
      icon: Send,
      eyebrow: 'Pay',
      title: 'Quid Checkout',
      body: 'A connected-wallet checkout that makes the amount, source chain, and recipient clear before payment.',
      href: paymentPageHref,
      action: primaryPage ? 'Open checkout' : 'Create a page first'
    },
    {
      icon: ScanLine,
      eyebrow: 'Open',
      title: 'Scan & Pay',
      body: 'Open a Quid payment from a camera scan, uploaded QR image, or a shared payment link.',
      href: primaryPage ? `${paymentPageHref}#scan-pay` : '/create',
      action: primaryPage ? 'Open scan and pay' : 'Create a page first'
    },
    {
      icon: WalletCards,
      eyebrow: 'Manage',
      title: 'Quid Wallet',
      body: 'See supported receive wallets, check balances, route funds with Gateway, and withdraw with proof.',
      href: primaryPage ? `${paymentPageHref}#withdraw` : dashboardHref,
      action: primaryPage ? 'Open wallet controls' : user ? 'Open dashboard' : 'Create a page first'
    }
  ]

  const proofPoints = [
    {
      icon: QrCode,
      title: 'One page to share',
      body: 'A link and QR code make the right payment route easy to find.'
    },
    {
      icon: ReceiptText,
      title: 'Receipts that tell the story',
      body: 'Amount, route, chain, status, and explorer proof remain together.'
    },
    {
      icon: ShieldCheck,
      title: 'Owner actions stay protected',
      body: 'Balances and withdrawals remain inside the account that owns them.'
    }
  ]

  const reasons = [
    ['Make the route obvious', 'Payers see who they are paying and where the payment will land before they send.'],
    ['Keep the detail available', 'Receipts and wallet activity carry the transaction evidence without burying the everyday flow.'],
    ['Give owners a way forward', 'Received USDC, Gateway balances, and withdrawal controls belong in one coherent workspace.'],
    ['Keep the interface calm', 'The product has room to explain financial activity without making every payment feel like an investigation.']
  ]

  const faqs = [
    ['Where does received USDC go?', 'Payments land in the Circle-backed receive wallet attached to the Quid payment page. Owners can check the route and move funds with their account controls.'],
    ['What does Gateway do?', "Gateway is Circle's cross-chain USDC layer. It is distinct from a receive-wallet balance, and Quid keeps that distinction visible."],
    ['Can someone pay without a Quid account?', 'Yes. A Quid payment page is meant to be shared. The payer opens the page, connects a supported wallet, and follows the checkout flow.'],
    ['Will we be seeing mainnet soon?', 'Yes. For the timebeing, this build is focused on Arc Testnet and launch-readiness work. Mainnet readiness needs compliance, production keys, monitoring, and security review.']
  ]

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <AppHeader includeSite>
        <HomeNavButton />
        {user ? (
          <>
            <DashboardNavMenu username={primaryPage?.username} />
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

      <section className="border-b border-arc/10 bg-haze/25">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-28 sm:pb-16 sm:pt-32 lg:grid-cols-[0.84fr_1.16fr] lg:gap-12 lg:pt-36">
          <div>
            <p className="inline-flex max-w-full rounded-md border border-arc/20 bg-paper px-3 py-2 text-sm font-bold leading-5 text-arc">
              Built for clear USDC movement, Use Quid
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.04] text-ink sm:text-5xl lg:text-6xl">
              Your <span className="quid-usdc-glow">USDC</span> payment workspace.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink/65">
              Give people one calm place to pay you. Quid brings the page, QR, checkout, wallet route, and proof into one product.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={dashboardHref}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-arc px-5 text-sm font-black text-white transition hover:bg-violet sm:w-auto"
              >
                {user ? 'Open dashboard' : 'Create your Quid page'} <ArrowRight size={18} />
              </Link>
              <a
                href="#product"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-arc/20 bg-paper px-5 text-sm font-black text-arc transition hover:border-arc/45 hover:text-arc dark:text-ink sm:w-auto"
              >
                Explore products <ArrowRight size={18} />
              </a>
            </div>

            <div className="mt-10 grid gap-3 border-t border-arc/15 pt-5 sm:grid-cols-3">
              {[
                ['One public page', 'for every pay route'],
                ['One clear flow', 'from wallet to receipt'],
                ['Proof after movement', 'not mystery afterward']
              ].map(([title, body]) => (
                <div key={title}>
                  <p className="text-sm font-black text-ink">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/55">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Image
              src="/brand/quid-q.png"
              alt=""
              width={300}
              height={300}
              className="pointer-events-none absolute -right-10 -top-16 hidden w-48 opacity-15 sm:block"
            />
            <div className="relative">
              <HomeShowcase />
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <ScrollReveal>
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase text-arc">Products on Quid</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-ink md:text-4xl">
              A payment product, not a pile of tools.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/60">
              Each product card takes you to the real part of Quid that does the work.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {products.map((product) => {
            const Icon = product.icon
            return (
              <ScrollReveal key={product.title}>
                <Link
                  href={product.href}
                  className="group relative flex h-full min-h-[268px] flex-col overflow-hidden rounded-lg border border-arc/20 bg-white p-6 text-ink shadow-panel transition duration-300 hover:-translate-y-0.5 hover:border-violet/45 dark:border-white/15 dark:bg-gradient-to-br dark:from-[#08072f]/94 dark:via-[#17143e]/90 dark:to-[#33205d]/84 dark:text-white dark:shadow-glow"
                >
                  <Image
                    src="/brand/quid-q.png"
                    alt=""
                    width={220}
                    height={220}
                    className="pointer-events-none absolute -right-10 -top-12 w-44 opacity-[0.12] dark:opacity-[0.09]"
                  />
                  <div className="relative">
                    <div className="grid h-11 w-11 place-items-center rounded-md border border-arc/15 bg-haze text-arc dark:border-arc/40 dark:bg-arc/15 dark:text-arc">
                      <Icon size={20} />
                    </div>
                    <p className="mt-6 text-xs font-black uppercase text-arc dark:text-arc">{product.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black">{product.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-ink/60 dark:text-white/75">{product.body}</p>
                  </div>
                  <span className="relative mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-arc dark:text-arc">
                    {product.action} <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="border-y border-arc/10 bg-haze/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <ScrollReveal>
            <p className="text-xs font-black uppercase text-arc">Payment clarity</p>
            <h2 className="mt-3 max-w-lg text-3xl font-black leading-tight text-ink md:text-4xl">
              Money movement should explain itself.
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-8 text-ink/60">
              Quid gives the interface some quiet, then gives every meaningful transaction the detail needed to understand it.
            </p>
          </ScrollReveal>

          <div className="border-y border-arc/15">
            {proofPoints.map((point) => {
              const Icon = point.icon

              return (
                <ScrollReveal key={point.title}>
                  <article className="flex gap-4 border-b border-arc/15 py-5 last:border-b-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-paper text-arc">
                      <Icon size={19} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-ink">{point.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-ink/60">{point.body}</p>
                    </div>
                  </article>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section id="why-quid" className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[0.82fr_1.18fr]">
        <ScrollReveal>
          <p className="text-xs font-black uppercase text-arc">Why Quid</p>
          <h2 className="mt-3 max-w-lg text-3xl font-black leading-tight text-ink md:text-4xl">
            Comfort for people. Detail for money.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-8 text-ink/60">
            The experience should feel easy before payment and dependable afterward, when someone needs to verify what happened.
          </p>
        </ScrollReveal>

        <div className="grid gap-7 sm:grid-cols-2">
          {reasons.map(([title, body]) => (
            <ScrollReveal key={title}>
              <article className="border-l-2 border-arc/25 pl-4">
                <BadgeCheck size={19} className="text-mint" />
                <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">{body}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-5 pb-16 sm:pb-20">
        <ScrollReveal>
          <p className="text-xs font-black uppercase text-arc">FAQ</p>
          <h2 className="mt-3 text-3xl font-black text-ink md:text-4xl">Quid, plainly explained.</h2>
        </ScrollReveal>
        <div className="mt-8 border-y border-arc/15">
          {faqs.map(([question, answer]) => (
            <ScrollReveal key={question}>
              <details className="group border-b border-arc/15 py-5 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-ink">
                  <span>{question}</span>
                  <CircleHelp size={20} className="shrink-0 rotate-180 text-arc transition-transform duration-200 group-open:rotate-0" />
                </summary>
                <p className="max-w-3xl pt-3 text-sm leading-7 text-ink/60">{answer}</p>
              </details>
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
                className="quid-secondary-action mt-7 h-12 border-white/60 bg-white px-5 text-arc dark:!bg-white"
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
