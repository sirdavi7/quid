'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

export function CopyLinkButton({ path }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const url = `${window.location.origin}${path}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="quid-secondary-action"
    >
      <Copy size={16} /> {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
