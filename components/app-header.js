import Link from 'next/link'
import { CircleHelp, Landmark, Menu, ShieldCheck } from 'lucide-react'
import { navButtonClass } from '@/components/nav-buttons'
import { QuidLogo } from '@/components/quid-logo'
import { SiteNavMenu } from '@/components/site-nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'

function MobileSiteLinks() {
  return (
    <>
      <a href="#product" className={navButtonClass}>
        <Landmark size={14} /> Product
      </a>
      <a href="#why-quid" className={navButtonClass}>
        <ShieldCheck size={14} /> Why Quid
      </a>
      <a href="#faq" className={navButtonClass}>
        <CircleHelp size={14} /> FAQ
      </a>
    </>
  )
}

export function AppHeader({ children, includeSite = false }) {
  return (
    <nav className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link href="/" aria-label="Quid home" className="inline-flex items-center self-start">
        <QuidLogo full priority />
      </Link>

      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        <ThemeToggle />
        <details className="group relative flex-1">
          <summary className={`${navButtonClass} w-full cursor-pointer list-none`}>
            <Menu size={14} /> Menu
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(16rem,calc(100vw-2rem))] gap-2 rounded-md border border-arc/20 bg-paper p-2 shadow-glow">
            {includeSite ? <MobileSiteLinks /> : null}
            {children}
          </div>
        </details>
      </div>

      <div className="hidden w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
        <ThemeToggle />
        {includeSite ? <SiteNavMenu /> : null}
        {children}
      </div>
    </nav>
  )
}
