'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Loader2, ReceiptText, RefreshCw, WalletCards, X } from 'lucide-react'
import { chainOptions } from '@/lib/chains'

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

function fullAddress(address) {
  return address || 'Not available'
}

function isBalanceSync(activity) {
  const source = String(activity.source ?? '').toLowerCase()
  const txHash = String(activity.txHash ?? '').toLowerCase()

  return source.includes('balance sync') || source.includes('unindexed') || txHash.startsWith('balance-sync-')
}

function activityType(activity) {
  const source = String(activity.source ?? '').toLowerCase()

  if (source.includes('withdraw') || source.includes('send') || source.includes('payout')) {
    return 'Send'
  }

  return 'Receive'
}

function activitySign(activity) {
  return activityType(activity) === 'Send' ? '-' : '+'
}

function activityStatus(activity) {
  return 'Confirmed'
}

function formatActivitySource(source) {
  const normalized = String(source ?? '').toLowerCase()

  if (normalized.includes('faucet')) return 'Faucet deposit'
  if (normalized.includes('balance sync') || normalized.includes('unindexed')) return 'Received USDC'
  if (normalized.includes('withdraw')) return 'Withdrawal'
  if (normalized.includes('send')) return 'Direct send'
  if (normalized.includes('direct')) return 'Direct deposit'

  return 'Wallet transfer'
}

function activityDescription(activity) {
  const type = activityType(activity)

  if (type === 'Send') {
    return `To ${shortAddress(activity.toAddress)} from received wallet`
  }

  if (isBalanceSync(activity)) {
    return `Confirmed to received wallet on ${activity.chain ?? 'supported chain'}`
  }

  return `From ${shortAddress(activity.fromAddress)} to received wallet`
}

function friendlyActivityError(message) {
  const text = String(message ?? '').toLowerCase()

  if (text.includes('size too large') || text.includes('defined limit') || text.includes('rate limit')) {
    return 'Latest chain activity is busy. Saved wallet transactions are still shown below.'
  }

  if (text.includes('fetch failed')) {
    return 'Quid could not reach the chain RPC. Saved wallet transactions are still shown below.'
  }

  return 'Latest wallet sync could not complete. Saved wallet transactions are still shown below.'
}

function explorerLabel(activity) {
  const chain = String(activity.chain ?? '').toLowerCase()
  return chain.includes('arc') ? 'ArcScan' : 'Explorer'
}

export function DashboardWalletActivity({ initialActivities = [], walletMocked = false }) {
  const [activities, setActivities] = useState(initialActivities)
  const [status, setStatus] = useState(walletMocked ? 'mocked' : 'idle')
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [tokenFilter, setTokenFilter] = useState('USDC')
  const [chainFilter, setChainFilter] = useState('All chains')
  const [receipt, setReceipt] = useState(null)
  const [mounted, setMounted] = useState(false)
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
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Wallet activity request failed.')
      }

      setActivities(payload.activities ?? [])
      setStatus('ready')
    } catch (err) {
      setError((activities.length || initialActivities.length) ? '' : friendlyActivityError(err.message))
      setStatus('error')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (didAutoLoad.current) return

    didAutoLoad.current = true
    syncActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletMocked])

  const tokens = useMemo(() => {
    const values = new Set(['USDC'])
    activities.forEach((activity) => {
      if (activity.asset) values.add(activity.asset)
    })
    return Array.from(values)
  }, [activities])

  const chains = useMemo(() => {
    const values = new Set(chainOptions.map((chain) => chain.label))
    activities.forEach((activity) => {
      if (activity.chain) values.add(activity.chain)
    })
    return Array.from(values).sort()
  }, [activities])

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesType = typeFilter === 'All types' || activityType(activity) === typeFilter
      const matchesToken = tokenFilter === 'All tokens' || (activity.asset ?? 'USDC') === tokenFilter
      const matchesChain = chainFilter === 'All chains' || (activity.chain ?? 'Arc Testnet') === chainFilter
      return matchesType && matchesToken && matchesChain
    })
  }, [activities, chainFilter, tokenFilter, typeFilter])

  const showEmptyState = !filteredActivities.length && status !== 'syncing'
  const receiptIsBalanceSync = receipt ? isBalanceSync(receipt) : false
  const receiptRows = receipt ? [
    ['Type', activityType(receipt)],
    ['Amount', formatUsdc(receipt.amount)],
    ['Received wallet', fullAddress(receipt.toAddress)],
    ...(receiptIsBalanceSync
      ? [
          ['Chain', receipt.chain ?? 'Supported chain'],
          ['Status', 'Confirmed by received wallet balance']
        ]
      : [
          [activityType(receipt) === 'Send' ? 'Recipient' : 'Sender', fullAddress(activityType(receipt) === 'Send' ? receipt.toAddress : receipt.fromAddress)],
          ['Transaction hash', fullAddress(receipt.txHash)],
          ['Block number', receipt.blockNumber ?? 'Pending explorer index']
        ]),
    ['Time', formatDate(receipt.happenedAt)]
  ] : []
  const receiptModal = receipt ? (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-night/55 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-xl rounded-xl border border-arc/20 bg-paper p-5 shadow-glow sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-arc">Transaction receipt</p>
            <h3 className="mt-1 text-3xl font-black text-ink">
              {activityType(receipt) === 'Send' ? 'Sent USDC' : 'Received USDC'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-arc/20 bg-white text-ink"
            aria-label="Close receipt"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-arc/15 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xl font-black text-ink">Quid</p>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
              {activityStatus(receipt)}
            </span>
          </div>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-ink/45">
            {receipt.chain ?? 'Arc Testnet'} receipt
          </p>
          <p className="mt-6 text-4xl font-black text-emerald-600">
            {activitySign(receipt)}{formatUsdc(receipt.amount)}
          </p>

          <dl className="mt-6 divide-y divide-ink/10 text-sm">
            {receiptRows.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                <dt className="font-bold text-ink/55">{label}</dt>
                <dd className="break-all font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {receipt.explorerUrl ? (
          <a
            href={receipt.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="quid-primary-action mt-4 w-full"
          >
            Open on {explorerLabel(receipt)} <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </div>
  ) : null

  return (
    <section className="quid-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-arc">Activity</p>
          <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl">Wallet transactions</h2>
        </div>
        <WalletCards className="mt-1 shrink-0 text-arc" />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink/60">Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-11 rounded-md border border-arc/20 bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-arc focus:ring-4 focus:ring-arc/10"
          >
            <option>All types</option>
            <option>Receive</option>
            <option>Send</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink/60">Token</span>
          <select
            value={tokenFilter}
            onChange={(event) => setTokenFilter(event.target.value)}
            className="h-11 rounded-md border border-arc/20 bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-arc focus:ring-4 focus:ring-arc/10"
          >
            <option>All tokens</option>
            {tokens.map((token) => (
              <option key={token}>{token}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink/60">Chain</span>
          <select
            value={chainFilter}
            onChange={(event) => setChainFilter(event.target.value)}
            className="h-11 rounded-md border border-arc/20 bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-arc focus:ring-4 focus:ring-arc/10"
          >
            <option>All chains</option>
            {chains.map((chain) => (
              <option key={chain}>{chain}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-2 font-semibold text-ink/55">
          <ReceiptText size={16} className="text-arc" />
          {filteredActivities.length} of {activities.length} wallet transactions
        </p>
        <button type="button" onClick={syncActivity} disabled={status === 'syncing'} className="quid-secondary-action h-9 px-3 text-xs">
          {status === 'syncing' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {status === 'syncing' ? 'Syncing' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-arc/20 bg-haze/70 px-3 py-2 text-sm font-semibold text-ink/65">
          {error}
        </p>
      ) : null}

      {walletMocked ? <p className="mt-4 text-sm font-semibold text-coral">Live wallet activity needs a real Circle wallet.</p> : null}

      {filteredActivities.length ? (
        <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1 sm:max-h-[30rem]">
          {filteredActivities.map((activity) => {
            const type = activityType(activity)
            const sign = activitySign(activity)
            const statusLabel = activityStatus(activity)

            return (
              <article
                key={`${activity.txHash}-${activity.blockNumber}`}
                className="rounded-lg border border-arc/15 bg-white p-4 shadow-[0_12px_34px_rgba(109,53,242,0.08)] transition hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-ink/10 bg-haze px-3 py-1 text-xs font-black text-ink/55">
                    {type}
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xl font-black text-ink">
                      {sign}{formatUsdc(activity.amount)}
                    </p>
                    <p className="mt-1 break-words text-sm text-ink/60">{activityDescription(activity)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-ink/40">
                      {formatDate(activity.happenedAt)} - {activity.chain ?? 'Arc Testnet'} - {formatActivitySource(activity.source)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReceipt(activity)}
                      className="quid-secondary-action h-9 gap-1 px-3 text-xs"
                    >
                      <ReceiptText size={13} /> Receipt
                    </button>
                    {activity.explorerUrl ? (
                      <a
                        href={activity.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="quid-secondary-action h-9 gap-1 px-3 text-xs"
                      >
                        Explorer <ExternalLink size={13} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="mt-5 rounded-md border border-dashed border-arc/25 bg-haze/70 p-5">
          <h3 className="font-black text-ink">No wallet transactions found yet</h3>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Faucet deposits, direct receives, sends, and withdrawals will appear here after Quid indexes them.
          </p>
        </div>
      ) : null}

      {activities[0]?.explorerUrl ? (
        <a
          href={activities[0].explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-black text-arc"
        >
          Open latest transaction <ExternalLink size={14} />
        </a>
      ) : null}

      {mounted && receiptModal ? createPortal(receiptModal, document.body) : null}
    </section>
  )
}
