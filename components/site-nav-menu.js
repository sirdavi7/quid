'use client'

import { ChevronDown, CircleHelp, Layers3, ShieldCheck } from 'lucide-react'
import { navButtonClass } from '@/components/nav-buttons'

const links = [
  { href: '#product', label: 'Product', icon: Layers3 },
  { href: '#why-quid', label: 'Why Quid', icon: ShieldCheck },
  { href: '#faq', label: 'FAQ', icon: CircleHelp }
]

export function SiteNavMenu({ compact = false }) {
  if (compact) {
    return links.map((link) => {
      const Icon = link.icon
      return (
        <a key={link.href} href={link.href} className={navButtonClass}>
          <Icon size={14} /> {link.label}
        </a>
      )
    })
  }

  return (
    <details className="group relative">
      <summary className={`${navButtonClass} cursor-pointer list-none`}>
        Site <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid min-w-44 gap-1 rounded-md border border-arc/20 bg-paper p-2 shadow-glow">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-ink/70 transition hover:text-arc"
            >
              <Icon size={15} /> {link.label}
            </a>
          )
        })}
      </div>
    </details>
  )
}
