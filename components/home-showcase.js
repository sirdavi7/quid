'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CircleDollarSign, Link2, QrCode, Send, WalletCards } from 'lucide-react'
import { UsdcMark } from '@/components/usdc-mark'

const slides = [
  {
    id: 'send',
    label: 'Send',
    icon: Send,
    eyebrow: 'Connected wallet',
    title: 'Send USDC clearly.',
    subtitle: 'Move Arc Testnet USDC from the wallet currently connected in your browser.'
  },
  {
    id: 'scan',
    label: 'Scan & Pay',
    icon: QrCode,
    eyebrow: 'Quid QR payment',
    title: 'Scan a Quid payment.',
    subtitle: 'Open a Quid QR payment link or scan to initiate an instant payment.'
  },
  {
    id: 'checkout',
    label: 'Checkout',
    icon: CircleDollarSign,
    eyebrow: 'Quid checkout',
    title: 'Checkout with context.',
    subtitle: 'Choose an amount and source chain before USDC reaches a Quid page.'
  },
  {
    id: 'withdraw',
    label: 'Withdraw',
    icon: WalletCards,
    eyebrow: 'Owner controls',
    title: 'Withdraw from any chain.',
    subtitle: 'Move received USDC from Arc or a supported chain through Gateway.'
  }
]

const variants = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -20 : 20 })
}

function PreviewField({ children, mark = false }) {
  return (
    <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-arc/15 bg-paper px-3 text-xs font-bold text-ink/55">
      {mark ? <UsdcMark /> : null}
      <span className="truncate">{children}</span>
    </div>
  )
}

function Preview({ slide }) {
  if (slide.id === 'send') {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_7rem]">
        <PreviewField>Recipient 0x...</PreviewField>
        <PreviewField mark>1.00 USDC</PreviewField>
        <div className="sm:col-span-2">
          <div className="flex h-10 items-center justify-center gap-2 rounded-md bg-arc px-3 text-xs font-black text-white"><Send size={14} /> Send USDC</div>
        </div>
      </div>
    )
  }

  if (slide.id === 'scan') {
    return (
      <div className="mt-6 grid gap-3">
        <PreviewField>/pay/username?amount=5</PreviewField>
        <div className="flex gap-2">
          <div className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-arc px-3 text-xs font-black text-white"><Link2 size={14} /> Open</div>
          <div className="grid h-10 w-10 place-items-center rounded-md border border-arc/20 bg-haze text-arc"><Camera size={15} /></div>
          <div className="grid h-10 w-10 place-items-center rounded-md border border-arc/20 bg-haze text-arc"><QrCode size={15} /></div>
        </div>
      </div>
    )
  }

  if (slide.id === 'checkout') {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PreviewField mark>5.00 USDC</PreviewField>
        <PreviewField>Arc Testnet</PreviewField>
        <div className="sm:col-span-2">
          <div className="flex h-10 items-center justify-center gap-2 rounded-md bg-arc px-3 text-xs font-black text-white"><CircleDollarSign size={14} /> Open checkout</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-3">
      <div className="flex items-center justify-between rounded-md border border-arc/15 bg-haze px-3 py-3">
        <div className="flex items-center gap-2 text-xs font-black text-ink"><UsdcMark /> Received USDC</div>
        <span className="text-xs font-bold text-arc">Any supported chain</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black text-ink/55">
        <span className="rounded-md border border-arc/15 bg-paper px-2 py-2">Arc</span>
        <span className="rounded-md border border-arc/15 bg-paper px-2 py-2">Gateway</span>
        <span className="rounded-md border border-arc/15 bg-paper px-2 py-2">Withdraw</span>
      </div>
    </div>
  )
}

export function HomeShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const activeSlide = slides[activeIndex]
  const Icon = activeSlide.icon

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDirection(1)
      setActiveIndex((index) => (index + 1) % slides.length)
    }, 4000)

    return () => window.clearInterval(interval)
  }, [])

  function selectSlide(index) {
    if (index === activeIndex) return
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  function handleDragEnd(_, info) {
    if (info.offset.x < -60 || info.velocity.x < -450) {
      setDirection(1)
      setActiveIndex((index) => (index + 1) % slides.length)
    } else if (info.offset.x > 60 || info.velocity.x > 450) {
      setDirection(-1)
      setActiveIndex((index) => (index - 1 + slides.length) % slides.length)
    }
  }

  return (
    <section className="w-full" aria-label="Quid product showcase">
      <div className="h-[292px] overflow-hidden rounded-lg border border-arc/20 bg-white shadow-panel sm:h-[308px]">
        <div className="flex h-11 items-center justify-between border-b border-arc/15 px-4 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-arc">
            <UsdcMark /> Quid workspace
          </div>
          <span className="text-xs font-bold text-ink/40">Arc Testnet</span>
        </div>

        <div className="relative h-[calc(100%-2.75rem)] overflow-hidden px-4 pt-5 sm:px-5 sm:pt-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={activeSlide.id}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
              className="cursor-grab touch-pan-y active:cursor-grabbing"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-arc">{activeSlide.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl">{activeSlide.title}</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-ink/60">{activeSlide.subtitle}</p>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-arc/20 bg-haze text-arc">
                  <Icon size={19} />
                </div>
              </div>
              <Preview slide={activeSlide} />
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 left-4 right-4 flex gap-1.5 sm:left-5 sm:right-5">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => selectSlide(index)}
                aria-label={`Show ${slide.label}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-7 bg-arc' : 'w-2 bg-ink/15 hover:bg-ink/30'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
