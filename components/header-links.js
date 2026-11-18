'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ArrowUpRight, CircleHelp, Droplets, Layers3, ShieldCheck } from 'lucide-react'

export const siteLinks = [
  { href: '/#product', hash: 'product', label: 'Product', icon: Layers3 },
  { href: '/#why-quid', hash: 'why-quid', label: 'Why Quid', icon: ShieldCheck },
  { href: '/#faq', hash: 'faq', label: 'FAQ', icon: CircleHelp }
]

export const faucetLink = {
  href: 'https://faucet.circle.com/',
  label: 'Faucet',
  icon: Droplets
}

const sectionIds = siteLinks.map((link) => link.hash)

// Returns the id of the home page section currently crossing the reading line.
export function useScrollSpy(enabled) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (!enabled) {
      setActive('')
      return undefined
    }

    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return undefined

    function update() {
      const line = window.innerHeight * 0.35
      let current = ''

      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= line && rect.bottom > line) current = section.id
      }

      setActive(current)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return active
}

const linkBase =
  'relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-bold transition-colors duration-200'

export function DesktopLinks({ activeHash }) {
  return (
    <ul className="flex items-center gap-0.5 rounded-xl border border-arc/10 bg-haze/40 p-1">
      {siteLinks.map((link) => {
        const active = activeHash === link.hash

        return (
          <li key={link.hash}>
            <Link
              href={link.href}
              aria-current={active ? 'location' : undefined}
              className={`${linkBase} ${active ? 'text-arc' : 'text-ink/65 hover:text-arc'}`}
            >
              {active ? (
                <motion.span
                  layoutId="header-active-link"
                  className="absolute inset-0 rounded-lg border border-arc/20 bg-paper shadow-panel"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                />
              ) : null}
              <span className="relative">{link.label}</span>
            </Link>
          </li>
        )
      })}
      <li>
        <a
          href={faucetLink.href}
          target="_blank"
          rel="noreferrer"
          className={`${linkBase} text-ink/65 hover:text-arc`}
        >
          {faucetLink.label} <ArrowUpRight size={12} />
        </a>
      </li>
    </ul>
  )
}
