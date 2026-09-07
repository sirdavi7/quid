'use client'

import { useEffect, useState } from 'react'
import { Link2, QrCode, ReceiptText, ScanLine, Send, ShieldCheck, WalletCards } from 'lucide-react'
import Image from 'next/image'

const slides = [
  {
    label: 'Pay Page',
    title: 'One public place to get paid',
    body: 'Share a Quid link with your handle, payment note, receive wallet, and checkout flow already connected.',
    stat: '/pay/username',
    meta: 'Public link',
    route: 'share to payer',
    chain: 'Any supported chain',
    proof: 'Pay page',
    accent: 'text-arc',
    icon: Link2
  },
  {
    label: 'QR',
    title: 'Scan, upload, or paste a pay link',
    body: 'Quid can open a payment from a live QR scan, an uploaded QR image, or a pasted Quid URL.',
    stat: 'Scan to pay',
    meta: 'Owner tool',
    route: 'QR to checkout',
    chain: 'Quid link',
    proof: 'Open page',
    accent: 'text-mint',
    icon: ScanLine
  },
  {
    label: 'Checkout',
    title: 'Connected wallet payments',
    body: 'Payers choose an amount and source chain, then send USDC from the wallet already in their browser.',
    stat: '+20.00 USDC',
    meta: 'Arc Testnet',
    route: 'wallet to /pay',
    chain: 'Arc Testnet',
    proof: 'Explorer',
    accent: 'text-mint',
    icon: WalletCards
  },
  {
    label: 'Receipts',
    title: 'Every movement gets context',
    body: 'Activity shows amount, route, chain, transaction type, status, receipt, and explorer proof where available.',
    stat: 'Direct deposit',
    meta: 'Confirmed',
    route: 'sender to received wallet',
    chain: 'Arc Testnet',
    proof: 'Receipt',
    accent: 'text-mint',
    icon: ReceiptText
  },
  {
    label: 'Withdraw',
    title: 'Move received USDC on Arc',
    body: 'Owner controls let you withdraw from the Circle-backed received wallet to your chosen Arc recipient.',
    stat: '-10.00 USDC',
    meta: 'Explorer',
    route: '/pay to wallet',
    chain: 'Arc Testnet',
    proof: 'ArcScan',
    accent: 'text-arc',
    icon: Send
  }
]

export function HomeShowcase() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 3600)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="home-showcase-static relative mx-auto w-full overflow-hidden rounded-lg border border-arc/20 bg-white p-2 shadow-panel sm:p-3 dark:bg-white/5">
      <div className="rounded-md bg-white p-3 text-ink sm:p-4 md:p-5 dark:bg-night dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-arc/15 pb-4 dark:border-white/10">
          <span>
            <Image
              src="/brand/quid-nobackground.png"
              alt="Quid"
              width={220}
              height={66}
              className="h-auto w-32 max-w-full dark:hidden sm:w-40 md:w-44"
              priority
            />
            <Image
              src="/brand/quid-nobackgroundglow.png"
              alt="Quid"
              width={220}
              height={66}
              className="hidden h-auto w-32 max-w-full dark:block sm:w-40 md:w-44"
              priority
            />
          </span>
          <div className="rounded-md border border-mint/25 bg-mint/10 px-3 py-2 text-xs font-black text-mint">
            USDC workspace
          </div>
        </div>

        <div className="mt-5 overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {slides.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.label} className="min-w-full">
                  <div className="grid gap-4 rounded-md border border-arc/25 bg-haze p-3 sm:p-4 md:grid-cols-[1.05fr_0.95fr] dark:border-arc/35 dark:bg-haze">
                    <div className="flex min-h-[18rem] flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-black ${item.accent}`}>{item.label}</p>
                            <h2 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl dark:text-white">{item.title}</h2>
                          </div>
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-arc/35 bg-arc/15 text-mint">
                            <Icon size={24} />
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-ink/65 dark:text-white/70">{item.body}</p>
                      </div>

                      <div className="mt-5 rounded-md border border-arc/20 bg-white p-3 sm:p-4 dark:border-arc/30 dark:bg-night">
                        <p className="text-xs font-black uppercase text-ink/45 dark:text-white/45">{item.meta}</p>
                        <p className="mt-1 text-2xl font-black text-ink dark:text-white">{item.stat}</p>
                      </div>
                    </div>

                    <div className="rounded-md border border-arc/20 bg-white p-3 dark:border-arc/30 dark:bg-night">
                      <div className="flex items-center justify-between gap-3 border-b border-arc/10 pb-3">
                        <div>
                          <p className="text-xs font-black uppercase text-ink/45 dark:text-white/45">Quid</p>
                          <p className="mt-1 text-lg font-black text-ink dark:text-white">{item.stat}</p>
                        </div>
                        <span className="rounded-md bg-mint/10 px-2 py-1 text-xs font-black uppercase text-mint">
                          {item.meta}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/55 dark:text-white/55">Route</span>
                          <span className="text-right font-black text-ink dark:text-white">{item.route}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/55 dark:text-white/55">Chain</span>
                          <span className="text-right font-black text-ink dark:text-white">{item.chain}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/55 dark:text-white/55">Proof</span>
                          <span className="text-right font-black text-arc">{item.proof}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-mint/25 bg-mint/10 p-3 sm:p-4 dark:border-mint/30 dark:bg-mint/10">
            <ReceiptText size={18} className="text-mint" />
            <p className="mt-4 text-sm font-black">Receipts tracked</p>
          </div>
          <div className="rounded-md border border-mint/25 bg-mint/10 p-3 sm:p-4 dark:border-mint/30 dark:bg-mint/10">
            <QrCode size={18} className="text-mint" />
            <p className="mt-4 text-sm font-black">QR payments</p>
          </div>
          <div className="rounded-md border border-arc/25 bg-gradient-to-r from-arc to-violet p-3 text-white sm:p-4">
            <Send size={18} />
            <p className="mt-4 text-sm font-black">Arc payouts</p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-arc/20 bg-haze p-3 text-ink sm:p-4 dark:border-arc/30 dark:bg-haze dark:text-white">
          <div className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck size={18} className="text-arc" /> Circle-backed received wallet
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/65">
            Received USDC lands in the page wallet, stays visible in your workspace, then moves to your chosen Arc address.
          </p>
        </div>

        <div className="mt-5 flex justify-center gap-2" aria-label="Product preview slides">
          {slides.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-label={`Show ${item.label}`}
              onClick={() => setActive(index)}
              className={`h-2 rounded-full transition-all ${
                active === index ? 'w-10 bg-mint shadow-glow' : 'w-2 bg-arc/25 dark:bg-white/35'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
