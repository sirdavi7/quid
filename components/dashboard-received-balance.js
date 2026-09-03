'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, WalletCards } from 'lucide-react'

function formatBalance(value) {
  if (value === null || value === undefined) {
    return '-- USDC'
  }

  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} USDC`
}

function friendlyBalanceError(message) {
  const text = String(message ?? '').toLowerCase()

  if (text.includes('json') || text.includes('doctype') || text.includes('unexpected token')) {
    return 'Quid could not read the balance response. Try refreshing in a moment.'
  }

  if (text.includes('fetch failed') || text.includes('network')) {
    return 'Quid could not reach the balance service. Try refreshing in a moment.'
  }

  return 'Unable to read received wallet balance right now.'
}

export function DashboardReceivedBalance({ walletAddress, walletMocked = false }) {
  const [balance, setBalance] = useState(null)
  const [status, setStatus] = useState(walletAddress ? 'idle' : 'missing')
  const [error, setError] = useState('')

  async function loadBalance() {
    if (!walletAddress || walletMocked) {
      setStatus(walletMocked ? 'mocked' : 'missing')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/arc-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Received wallet balance request failed.')
      }

      setBalance(payload.balance)
      setStatus('ready')
    } catch (err) {
      setError(friendlyBalanceError(err.message))
      setStatus('error')
    }
  }

  useEffect(() => {
    loadBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, walletMocked])

  return (
    <div className="quid-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase text-ink/50">Arc received balance</p>
        <WalletCards size={18} className="text-arc" />
      </div>
      <p className="mt-4 text-3xl font-black text-ink">
        {status === 'loading' ? 'Checking...' : formatBalance(balance)}
      </p>
      <p className="mt-2 text-sm text-ink/55">
        Live Arc Testnet USDC in your default Quid receive wallet.
      </p>
      <button
        type="button"
        onClick={loadBalance}
        disabled={status === 'loading' || !walletAddress || walletMocked}
        className="quid-secondary-action mt-4 h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Refresh balance
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-coral">{error}</p> : null}
      {walletMocked ? <p className="mt-3 text-sm font-semibold text-coral">Live balance needs a real Circle wallet.</p> : null}
    </div>
  )
}
