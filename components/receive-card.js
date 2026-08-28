'use client'

import QRCode from 'qrcode'
import { Copy, QrCode, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ReceiveCard({ page }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState('')

  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/pay/${page.username}`
    return `${window.location.origin}/pay/${page.username}`
  }, [page.username])

  useEffect(() => {
    let isMounted = true

    QRCode.toDataURL(pageUrl, {
      margin: 2,
      width: 220,
      color: {
        dark: '#08033a',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url)
      })
      .catch(() => {
        if (isMounted) setQrDataUrl('')
      })

    return () => {
      isMounted = false
    }
  }, [pageUrl])

  async function copyValue(value, type) {
    await navigator.clipboard.writeText(value)
    setCopied(type)
    window.setTimeout(() => setCopied(''), 1600)
  }

  return (
    <section className="rounded-lg border border-arc/20 bg-white p-5 shadow-panel transition hover:-translate-y-1 hover:border-arc/35 hover:shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-arc">Receive</p>
          <h2 className="mt-1 text-2xl font-black text-ink">@{page.username}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">Share this page or the wallet address to receive Arc Testnet USDC.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md border border-arc/20 bg-haze text-arc">
          <QrCode size={20} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="grid min-h-[220px] place-items-center rounded-lg border border-arc/20 bg-paper p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for /pay/${page.username}`} className="h-full max-h-[196px] w-full max-w-[196px] rounded-md" />
          ) : (
            <div className="grid h-[196px] w-[196px] place-items-center rounded-md bg-haze text-sm font-bold text-ink/50">QR loading</div>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="rounded-md border border-ink/10 bg-paper p-4">
            <p className="text-xs font-black uppercase text-ink/45">Payment link</p>
            <p className="mt-2 break-all font-mono text-sm font-bold text-ink">{pageUrl}</p>
          </div>

          <div className="rounded-md border border-ink/10 bg-paper p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-ink/45">
              <WalletCards size={15} /> Arc USDC wallet
            </div>
            <p className="mt-2 break-all font-mono text-sm font-bold text-ink">{page.walletAddress}</p>
            <p className="mt-1 text-xs font-semibold text-ink/45">{shortAddress(page.walletAddress)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyValue(pageUrl, 'link')}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-arc/20 bg-transparent px-3 text-sm font-bold text-arc shadow-panel transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-arc/40 hover:shadow-glow"
            >
              <Copy size={16} /> {copied === 'link' ? 'Copied link' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => copyValue(page.walletAddress, 'address')}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-arc/20 bg-transparent px-3 text-sm font-bold text-arc shadow-panel transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-arc/40 hover:shadow-glow"
            >
              <Copy size={16} /> {copied === 'address' ? 'Copied address' : 'Copy address'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
