'use client'

import Link from 'next/link'
import { ChevronDown, ExternalLink, LayoutDashboard } from 'lucide-react'
import { navButtonClass } from '@/components/nav-buttons'

function DashboardLinks({ username, compact = false }) {
  const paymentHref = username ? `/pay/${username}` : '/create'
  const paymentLabel = username ? 'Open payment page' : 'Create payment page'
  const linkClass = compact
    ? navButtonClass
    : 'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-ink/70 transition hover:text-arc'

  return (
    <>
      <Link href="/dashboard" className={linkClass}>
        <LayoutDashboard size={compact ? 14 : 15} /> Dashboard
      </Link>
      <Link href={paymentHref} className={linkClass}>
        <ExternalLink size={compact ? 14 : 15} /> {paymentLabel}
      </Link>
    </>
  )
}

export function DashboardNavMenu({ username }) {
  return (
    <>
      <details className="group relative hidden md:block">
        <summary className={`${navButtonClass} cursor-pointer list-none`}>
          <LayoutDashboard size={14} /> Dashboard <ChevronDown size={14} className="transition group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 z-30 mt-2 grid min-w-48 gap-1 rounded-md border border-arc/20 bg-paper p-2 shadow-glow">
          <DashboardLinks username={username} />
        </div>
      </details>
      <div className="grid gap-2 md:hidden">
        <DashboardLinks username={username} compact />
      </div>
    </>
  )
}
