'use client'

import { useEffect, useState } from 'react'
import { Link2, ReceiptText, Send, ShieldCheck, WalletCards } from 'lucide-react'
import Image from 'next/image'

const slides = [
  {
    label: 'Create',
    title: 'Claim a pay link',
    body: 'Your Quid page carries your handle, wallet, payment note, and a clean checkout.',
    stat: 'quid.link/sirdavid',
    icon: Link2
  },
  {
    label: 'Receive',
    title: 'Let payers checkout',
    body: 'Payers connect a wallet, choose a supported source chain, and send USDC.',
    stat: '+25.00 USDC',
    icon: WalletCards
  },
  {
    label: 'Withdraw',
    title: 'Move funds on Arc',
    body: 'Owner tools separate checkout records, direct deposits, balances, and payouts.',
    stat: 'Arc withdrawal',
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
    <div className="home-showcase-static relative mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-arc/20 bg-white p-2 shadow-panel sm:p-3 dark:bg-white/5">
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
            Arc Testnet
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
                  <div className="rounded-md border border-arc/25 bg-haze p-3 sm:p-4 dark:border-arc/35 dark:bg-haze">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-mint">{item.label}</p>
                        <h2 className="mt-1 text-2xl font-black leading-tight text-ink sm:text-3xl dark:text-white">{item.title}</h2>
                      </div>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-arc/35 bg-arc/15 text-mint">
                        <Icon size={24} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/70">{item.body}</p>
                    <div className="mt-4 rounded-md border border-arc/20 bg-white p-3 sm:p-4 dark:border-arc/30 dark:bg-night">
                      <p className="text-xs font-black uppercase text-ink/45 dark:text-white/45">Live surface</p>
                      <p className="mt-1 text-2xl font-black text-ink dark:text-white">{item.stat}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-arc/20 bg-haze p-3 sm:p-4 dark:border-arc/30 dark:bg-haze">
            <ReceiptText size={18} className="text-mint" />
            <p className="mt-4 text-sm font-black">Receipts tracked</p>
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
            Received USDC lands in the page wallet, then moves to your chosen Arc address.
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