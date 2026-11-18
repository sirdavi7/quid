import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { QuidLogo } from '@/components/quid-logo'

const linkClass = 'transition-colors hover:text-arc'
const externalClass = 'inline-flex items-center gap-1 transition-colors hover:text-arc'

const resources = [
  { href: 'https://faucet.circle.com/', label: 'Circle testnet faucet' },
  { href: 'https://testnet.arcscan.app', label: 'Arc Explorer' },
  { href: 'https://docs.arc.network', label: 'Arc docs' },
  { href: 'https://developers.circle.com/', label: 'Circle docs' },
  { href: 'https://x.com/usequid', label: 'X / Twitter' }
]

export function AppFooter({ paymentPageHref = '/dashboard' }) {
  return (
    <footer className="px-3 pb-4 pt-6 sm:px-4">
      <div className="relative mx-auto max-w-6xl rounded-2xl border border-arc/10 bg-paper/70 px-5 py-9 shadow-[0_10px_34px_rgba(109,53,242,0.08)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_10px_34px_rgba(0,0,0,0.4)] sm:px-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-arc/50 to-transparent"
        />

        <div className="grid gap-8 md:grid-cols-[1.4fr_0.8fr_1fr]">
          <div>
            <QuidLogo full size="footer" />
            <p className="mt-4 max-w-sm leading-7 text-ink/60">
              Personal USDC payment pages for creators who need readable checkout, receive wallets, and withdrawals powered by Circle infrastructure.
            </p>
            <p className="mt-5 text-sm font-black text-arc">USDC pay links powered by Circle.</p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-sm font-black uppercase text-ink/70">Explore</h3>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ink/55">
              <Link href="/#product" className={linkClass}>Product</Link>
              <Link href="/#why-quid" className={linkClass}>Why Quid</Link>
              <Link href="/#faq" className={linkClass}>FAQ</Link>
              <Link href="/dashboard" className={linkClass}>Dashboard</Link>
              <Link href={paymentPageHref} className={linkClass}>Open payment page</Link>
            </div>
          </nav>

          <nav aria-label="Resources">
            <h3 className="text-sm font-black uppercase text-ink/70">Resources</h3>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ink/55">
              {resources.map((item) => (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={externalClass}>
                  {item.label} <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-arc/10 pt-5 text-xs font-semibold text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Quid USDC Payments. Built on Circle and Arc.</p>
          <p>Pay links, QR codes, received balances, and withdrawals in one workspace.</p>
        </div>
      </div>
    </footer>
  )
}
