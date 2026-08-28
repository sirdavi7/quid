'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

export function CopyAddressButton({ address, label = 'Circle wallet address' }) {
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copyAddress}
      className="quid-secondary-action mt-3 h-8 px-2 text-xs"
      aria-label={`Copy ${label}`}
    >
      <Copy size={14} /> {copied ? 'Copied address' : label}
    </button>
  )
}
