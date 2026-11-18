'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, LayoutDashboard, Menu, Plus, X } from 'lucide-react'
import { AccountMenu } from '@/components/header-account'
import { DesktopLinks, useScrollSpy } from '@/components/header-links'
import { MobileSheet } from '@/components/header-mobile-sheet'
import { QuidLogo } from '@/components/quid-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useDismiss } from '@/components/use-dismiss'

const HeaderWalletPill = dynamic(() => import('./header-wallet-pill'), {
  ssr: false,
  loading: () => <span className="inline-block h-10 w-36 rounded-xl border border-arc/10 bg-haze/40" />
})

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-arc/20 bg-paper/60 text-ink transition hover:border-arc/45 hover:text-arc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arc/40'

function getCta(account, pathname) {
  if (!account) return { href: '/create', label: 'Create your page', icon: Plus }
  if (!account.username) return { href: '/create', label: 'Create page', icon: Plus }
  if (pathname.startsWith('/dashboard')) {
    return { href: `/pay/${account.username}`, label: 'View my page', icon: ExternalLink }
  }
  return { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
}

/**
 * Site header.
 * - account: { email, username? } for a signed-in viewer, otherwise null
 * - showWallet: show the connected wallet and network pill
 * - pending: loading state with no account actions
 */
export function AppHeader({ account = null, showWallet = false, pending = false }) {
  const pathname = usePathname() ?? '/'
  const [scrolled, setScrolled] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const activeHash = useScrollSpy(pathname === '/')
  const cta = getCta(account, pathname)
  const CtaIcon = cta.icon
  const showLogin = pathname !== '/login'

  useDismiss(sheetOpen, closeSheet, headerRef)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!sheetOpen) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event) {
      if (event.key === 'Escape') toggleRef.current?.focus()
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  return (
    <MotionConfig reducedMotion="user">
      <header
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-50 px-3 transition-[padding] duration-300 sm:px-5 ${scrolled ? 'pt-2' : 'pt-4 sm:pt-5'}`}
      >
        {sheetOpen ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={closeSheet}
            className="fixed inset-0 -z-10 bg-night/45 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <nav
          aria-label="Primary"
          className={`relative mx-auto flex items-center justify-between gap-4 rounded-2xl border px-5 backdrop-blur-xl transition-all duration-300 sm:px-8 ${
            scrolled
              ? 'h-16 max-w-[62rem] border-arc/25 bg-paper/90 shadow-[0_18px_50px_rgba(109,53,242,0.2)] dark:border-white/15 dark:shadow-[0_18px_50px_rgba(0,0,0,0.55)]'
              : 'h-[4.5rem] max-w-6xl border-arc/10 bg-paper/70 shadow-[0_10px_34px_rgba(109,53,242,0.08)] dark:border-white/10 dark:shadow-[0_10px_34px_rgba(0,0,0,0.4)]'
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -bottom-px h-px bg-gradient-to-r from-transparent via-arc/50 to-transparent"
          />

          <Link href="/" aria-label="Quid home" className="inline-flex shrink-0 items-center pl-2">
            <span
              className={`inline-flex origin-left transition-transform duration-300 ${scrolled ? 'scale-[0.8]' : 'scale-[0.85]'}`}
            >
              <QuidLogo full size="header" priority />
            </span>
          </Link>

          <div className="hidden lg:block">
            <DesktopLinks activeHash={activeHash} />
          </div>

          <div className="hidden items-center justify-end gap-2 lg:flex">
            <ThemeToggle className={iconButtonClass} />
            {!pending && showWallet ? <HeaderWalletPill /> : null}
            {!pending && account ? <AccountMenu account={account} /> : null}
            {!pending && !account && showLogin ? (
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-bold text-ink/70 transition hover:text-arc"
              >
                Log in
              </Link>
            ) : null}
            {!pending ? (
              <Link href={cta.href} className="quid-primary-action h-10 rounded-xl px-4">
                <CtaIcon size={16} /> {cta.label}
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle className={iconButtonClass} />
            {!pending ? (
              <button
                ref={toggleRef}
                type="button"
                aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={sheetOpen}
                aria-controls="mobile-menu"
                onClick={() => setSheetOpen((value) => !value)}
                className={iconButtonClass}
              >
                {sheetOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            ) : null}
          </div>
        </nav>

        {!pending ? (
          <MobileSheet
            id="mobile-menu"
            open={sheetOpen}
            account={account}
            pathname={pathname}
            activeHash={activeHash}
            cta={cta}
            showWallet={showWallet}
            showLogin={showLogin}
            onClose={closeSheet}
          />
        ) : null}
      </header>
      <div aria-hidden="true" className="h-28" />
    </MotionConfig>
  )
}
