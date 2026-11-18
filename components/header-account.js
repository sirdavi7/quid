'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, LayoutDashboard, Plus, Settings } from 'lucide-react'
import { SignOutConfirmButton } from '@/components/sign-out-confirm-button'
import { useDismiss } from '@/components/use-dismiss'

const rowClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-ink/75 transition-colors hover:bg-arc/10 hover:text-arc aria-[current=page]:bg-arc/10 aria-[current=page]:text-arc'

export function accountLabel(account) {
  if (account.username) return `@${account.username}`
  return String(account.email ?? 'Account').split('@')[0]
}

function accountInitial(account) {
  return accountLabel(account).replace('@', '').slice(0, 1).toUpperCase() || 'Q'
}

export function AccountLinks({ account, pathname, role, onNavigate }) {
  const [copied, setCopied] = useState(false)
  const current = (href) => (pathname === href ? 'page' : undefined)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pay/${account.username}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Link href="/dashboard" role={role} aria-current={current('/dashboard')} onClick={onNavigate} className={rowClass}>
        <LayoutDashboard size={16} /> Dashboard
      </Link>
      {account.username ? (
        <>
          <Link
            href={`/pay/${account.username}`}
            role={role}
            aria-current={current(`/pay/${account.username}`)}
            onClick={onNavigate}
            className={rowClass}
          >
            <ExternalLink size={16} /> My payment page
          </Link>
          <button type="button" role={role} onClick={copyLink} className={rowClass}>
            {copied ? <Check size={16} className="text-mint" /> : <Copy size={16} />}
            {copied ? 'Link copied' : 'Copy payment link'}
          </button>
          <Link href="/settings" role={role} aria-current={current('/settings')} onClick={onNavigate} className={rowClass}>
            <Settings size={16} /> Settings
          </Link>
        </>
      ) : (
        <Link href="/create" role={role} aria-current={current('/create')} onClick={onNavigate} className={rowClass}>
          <Plus size={16} /> Create payment page
        </Link>
      )}
      <SignOutConfirmButton className={`${rowClass} text-coral hover:!bg-coral/10 hover:!text-coral`} />
    </>
  )
}

export function AccountMenu({ account }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  useDismiss(open, close, ref)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-arc/20 bg-paper/60 py-1 pl-1 pr-2.5 text-sm font-bold text-ink transition hover:border-arc/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arc/40 lg:pr-3"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-arc to-violet text-xs font-black text-white">
          {accountInitial(account)}
        </span>
        <span className="hidden max-w-[7.5rem] truncate xl:inline">{accountLabel(account)}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        role="menu"
        aria-label="Account"
        className={`${open ? 'grid' : 'hidden'} absolute right-0 top-full z-50 mt-3 w-72 gap-1 rounded-2xl border border-arc/20 bg-paper p-2 shadow-glow dark:border-white/15`}
      >
        <div className="px-3 pb-2 pt-1.5">
          <p className="text-xs font-black uppercase text-arc">Signed in</p>
          <p className="mt-1 truncate text-sm font-bold text-ink/70">{account.email}</p>
        </div>
        <div className="grid gap-0.5 border-t border-arc/10 pt-1.5">
          <AccountLinks account={account} pathname={pathname} role="menuitem" onNavigate={close} />
        </div>
      </div>
    </div>
  )
}
