import Link from 'next/link'
import { Menu } from 'lucide-react'
import { navButtonClass } from '@/components/nav-buttons'
import { QuidLogo } from '@/components/quid-logo'
import { SiteNavMenu } from '@/components/site-nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'

export function AppHeader({ children, includeSite = false }) {
  return (
    <header className="sticky top-0 z-40 border-b border-arc/10 bg-paper/92 shadow-[0_14px_40px_rgba(109,53,242,0.06)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" aria-label="Quid home" className="inline-flex shrink-0 items-center">
          <QuidLogo full size="header" priority />
        </Link>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <ThemeToggle />
          <details className="group relative">
            <summary className={`${navButtonClass} h-9 cursor-pointer list-none px-3 text-xs`}>
              <Menu size={14} /> Menu
            </summary>
            <div className="absolute right-0 z-50 mt-2 grid w-[min(17rem,calc(100vw-2rem))] gap-2 rounded-md border border-arc/20 bg-paper p-2 shadow-glow">
              {includeSite ? <SiteNavMenu compact /> : null}
              {children}
            </div>
          </details>
        </div>
      </nav>
    </header>
  )
}
