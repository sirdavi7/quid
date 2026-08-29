import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { QuidLogo } from '@/components/quid-logo'

export function AppFooter() {
  return (
    <footer className="border-t border-arc/10 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <QuidLogo full />
          <p className="font-semibold">
            © 2026 Quid USDC Pay. Powered by Circle Wallets, Gateway, and Arc.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-bold text-arc">
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
            Faucet <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </footer>
  )
}
