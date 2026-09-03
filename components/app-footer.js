import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { QuidLogo } from '@/components/quid-logo'

export function AppFooter({ paymentPageHref = '/dashboard' }) {
  return (
    <footer className="border-t border-arc/10 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="grid gap-8 md:grid-cols-[1.25fr_0.7fr_0.7fr_0.9fr]">
          <div>
            <QuidLogo full size="footer" />
            <p className="mt-4 max-w-sm leading-7 text-ink/60">
              Personal USDC payment pages for creators who need readable checkout, receive wallets, and withdrawals powered by Circle infrastructure.
            </p>
            <p className="mt-5 text-sm font-black text-arc">USDC pay links powered by Circle.</p>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-ink/70">Site</h3>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ink/55">
              <Link href="/#product" className="transition hover:text-arc">Product</Link>
              <Link href="/#why-quid" className="transition hover:text-arc">Why Quid</Link>
              <Link href="/#faq" className="transition hover:text-arc">FAQ</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-ink/70">App</h3>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ink/55">
              <Link href="/dashboard" className="transition hover:text-arc">Dashboard</Link>
              <Link href={paymentPageHref} className="transition hover:text-arc">Open payment page</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-ink/70">Resources</h3>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ink/55">
              <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-arc">
                Circle testnet faucet <ExternalLink size={13} />
              </a>
              <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-arc">
                Arc Explorer <ExternalLink size={13} />
              </a>
              <a href="https://docs.arc.network" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-arc">
                Arc docs <ExternalLink size={13} />
              </a>
              <a href="https://developers.circle.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-arc">
                Circle docs <ExternalLink size={13} />
              </a>
              <span className="text-ink/35">X / Twitter coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
