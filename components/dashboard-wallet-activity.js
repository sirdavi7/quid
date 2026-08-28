'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, WalletCards } from 'lucide-react'

function formatUsdc(value) {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} USDC`
}

function formatDate(value) {
  if (!value) return 'Pending'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function shortAddress(address) {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}


function formatActivitySource(source) {
  const normalized = String(source ?? '').toLowerCase()

  if (normalized.includes('faucet')) return 'Faucet deposit'
  if (normalized.includes('balance sync') || normalized.includes('unindexed')) return 'Unindexed deposit'
  if (normalized.includes('direct')) return 'Direct deposit'

  return 'Direct deposit'
}

function activityDescription(activity) {
  const source = String(activity.source ?? '').toLowerCase()

  if (!activity.fromAddress && (source.includes('balance sync') || source.includes('unindexed'))) {
    return `Unindexed ${activity.chain ?? 'USDC'} deposit detected in received wallet`
  }

  return 'From ' + shortAddress(activity.fromAddress) + ' to received wallet'
}

function friendlyActivityError(message) {
  const text = String(message ?? '').toLowerCase()

  if (text.includes('size too large') || text.includes('defined limit') || text.includes('rate limit')) {
      return 'Wallet activity is busy right now. Showing saved direct deposits.'
  }

  if (text.includes('fetch failed')) {
      return 'Quid could not reach the chain RPC right now. Showing saved direct deposits.'
  }

  return 'Unable to sync new direct deposits. Showing saved activity.'
}

export function DashboardWalletActivity({ initialActivities = [], walletMocked = false }) {
  const [activities, setActivities] = useState(initialActivities)
  const [status, setStatus] = useState(walletMocked ? 'mocked' : 'idle')
  const [error, setError] = useState('')
  const didAutoLoad = useRef(false)

  async function syncActivity() {
    if (walletMocked) {
      setStatus('mocked')
      return
    }

    setStatus('syncing')
    setError('')

    try {
      const response = await fetch('/api/arc-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Wallet activity request failed.')
      }

      setActivities(payload.activities ?? [])
      setStatus('ready')
    } catch (err) {
      setError(friendlyActivityError(err.message))
      setStatus('error')
    }
  }

  useEffect(() => {
    if (didAutoLoad.current) return

    didAutoLoad.current = true
    syncActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletMocked])

  const showEmptyState = !activities.length && (status === 'idle' || status === 'ready' || status === 'error')

  return (
    <section className="quid-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Wallet activity</p>
          <h2 className="mt-1 text-2xl font-black text-ink">Direct deposits</h2>
        </div>
        <WalletCards className="text-arc" />
      </div>

      {status === 'syncing' ? (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-arc/20 bg-haze p-4 text-sm font-bold text-arc">
          <Loader2 size={16} className="animate-spin" /> Syncing latest direct deposits
        </div>
      ) : null}

      {activities.length ? (
        <div className="mt-5 divide-y divide-ink/10">
          {activities.map((activity) => (
            <article key={`${activity.txHash}-${activity.blockNumber}`} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-ink">+{formatUsdc(activity.amount)}</p>
                  <p className="mt-1 text-sm text-ink/55">
                    {activityDescription(activity)}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-ink/40">
                    {formatDate(activity.happenedAt)} - {activity.chain ?? 'Arc Testnet'} - {formatActivitySource(activity.source)}
                  </p>
                </div>
                {activity.explorerUrl ? (
                  <a
                    href={activity.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="quid-secondary-action h-8 gap-1 px-2 text-xs"
                  >
                    Explorer <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="mt-5 rounded-md border border-dashed border-arc/25 bg-haze/70 p-5">
          <h3 className="font-black text-ink">No direct deposits found yet</h3>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Faucet or manual USDC deposits on supported receive wallets will appear here after Quid indexes them.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      {walletMocked ? <p className="mt-4 text-sm font-semibold text-coral">Live wallet activity needs a real Circle wallet.</p> : null}
    </section>
  )
}
