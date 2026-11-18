'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowUpRight, LogIn } from 'lucide-react'
import { AccountLinks, accountLabel } from '@/components/header-account'
import { faucetLink, siteLinks } from '@/components/header-links'

const HeaderWalletPill = dynamic(() => import('./header-wallet-pill'), { ssr: false })

const rowClass =
  'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-base font-bold text-ink/80 transition-colors hover:bg-arc/10 hover:text-arc aria-[current=location]:bg-arc/10 aria-[current=location]:text-arc'

export function MobileSheet({ open, account, pathname, activeHash, cta, showWallet, showLogin, onClose, id }) {
  const CtaIcon = cta.icon

  return (
    <div
      id={id}
      className={`${open ? 'grid' : 'hidden'} absolute inset-x-3 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] gap-3 overflow-y-auto rounded-2xl border border-arc/20 bg-paper p-3 shadow-glow dark:border-white/15 sm:inset-x-4 lg:hidden`}
    >
      <nav aria-label="Site" className="grid gap-0.5">
        {siteLinks.map((link) => {
          const Icon = link.icon
          const active = pathname === '/' && activeHash === link.hash

          return (
            <Link
              key={link.hash}
              href={link.href}
              onClick={onClose}
              aria-current={active ? 'location' : undefined}
              className={rowClass}
            >
              <Icon size={18} /> {link.label}
            </Link>
          )
        })}
        <a href={faucetLink.href} target="_blank" rel="noreferrer" onClick={onClose} className={rowClass}>
          <faucetLink.icon size={18} /> {faucetLink.label} <ArrowUpRight size={14} className="ml-auto text-ink/40" />
        </a>
      </nav>

      {account ? (
        <div className="grid gap-0.5 border-t border-arc/10 pt-3">
          <div className="px-3.5 pb-1">
            <p className="text-xs font-black uppercase text-arc">{accountLabel(account)}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-ink/55">{account.email}</p>
          </div>
          <AccountLinks account={account} pathname={pathname} onNavigate={onClose} />
        </div>
      ) : null}

      <div className="grid gap-2 border-t border-arc/10 pt-3">
        {showWallet ? <HeaderWalletPill fullWidth /> : null}
        {!account && showLogin ? (
          <Link href="/login" onClick={onClose} className="quid-secondary-action h-11 text-sm">
            <LogIn size={16} /> Log in
          </Link>
        ) : null}
        <Link href={cta.href} onClick={onClose} className="quid-primary-action h-11 text-sm">
          <CtaIcon size={16} /> {cta.label}
        </Link>
      </div>
    </div>
  )
}
