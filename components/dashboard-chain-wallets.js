'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Loader2, RefreshCw, WalletCards } from 'lucide-react'
import { chainOptions } from '@/lib/chains'

function shortAddress(address) {
  if (!address) return 'Not set up'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatBalance(value) {
  if (value === undefined || value === null) {
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
    return 'Balance response unavailable.'
  }

  if (text.includes('fetch failed') || text.includes('network')) {
    return 'Balance service unavailable.'
  }

  return 'Balance unavailable.'
}

function primaryArcWalletFromPage(page) {
  if (!page?.walletAddress) {
    return null
  }

  const arcChain = chainOptions[0]

  return {
    walletId: page.walletId,
    walletAddress: page.walletAddress,
    walletBlockchain: page.walletBlockchain,
    walletAccountType: page.walletAccountType,
    chainId: arcChain.id,
    chainLabel: arcChain.label,
    gatewayName: arcChain.gatewayName,
    usdcAddress: arcChain.usdcAddress,
    mocked: page.walletMocked
  }
}

export function DashboardChainWallets({ initialWallets = [], page = null, walletMocked = false }) {
  const [wallets, setWallets] = useState(initialWallets)
  const [status, setStatus] = useState('idle')
  const [balances, setBalances] = useState({})
  const [balanceStatus, setBalanceStatus] = useState('idle')
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  async function setupWallets() {
    setStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/page-wallets', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to set up chain wallets.')
      }

      setWallets(payload.wallets ?? [])
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    }
  }

  async function copyAddress(address, chainId) {
    if (!address) return

    await navigator.clipboard.writeText(address)
    setCopied(String(chainId))
    setTimeout(() => setCopied(''), 1200)
  }

  async function loadBalances(walletList) {
    if (walletMocked || !walletList.length) {
      return
    }

    setBalanceStatus('loading')

    const results = await Promise.all(
      walletList.map(async (wallet) => {
        try {
          const response = await fetch('/api/chain-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: wallet.walletAddress,
              chainId: wallet.chainId
            })
          })
          const payload = await response.json().catch(() => ({}))

          if (!response.ok) {
            throw new Error(payload.error ?? 'Balance unavailable.')
          }

          return [wallet.chainId, { balance: payload.balance }]
        } catch (requestError) {
          return [wallet.chainId, { error: friendlyBalanceError(requestError.message) }]
        }
      })
    )

    setBalances(Object.fromEntries(results))
    setBalanceStatus('ready')
  }

  const primaryArcWallet = primaryArcWalletFromPage(page)
  const mergedWallets =
    primaryArcWallet && !wallets.some((wallet) => wallet.chainId === primaryArcWallet.chainId)
      ? [primaryArcWallet, ...wallets]
      : wallets
  const walletByChain = new Map(mergedWallets.map((wallet) => [wallet.chainId, wallet]))
  const missingCount = chainOptions.filter((chain) => !walletByChain.has(chain.id)).length
  const walletKey = mergedWallets
    .map((wallet) => `${wallet.chainId}:${wallet.walletAddress}`)
    .sort()
    .join('|')

  useEffect(() => {
    if (missingCount > 0 && status === 'idle' && !walletMocked) {
      setupWallets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingCount, status, walletMocked])

  useEffect(() => {
    loadBalances(mergedWallets.filter((wallet) => wallet.walletAddress))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletKey, walletMocked])

  return (
    <section className="quid-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Wallets</p>
          <h2 className="mt-1 text-2xl font-black text-ink">Supported chain wallets</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            These are the Quid-controlled receive wallets used for chain-aware balances, Gateway deposits, and withdrawals.
          </p>
        </div>
        <button
          type="button"
          onClick={setupWallets}
          disabled={status === 'loading' || walletMocked}
          className="quid-secondary-action h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {status === 'loading'
            ? 'Completing setup'
            : status === 'error'
              ? 'Retry wallet setup'
              : missingCount
                ? 'Complete wallet setup'
                : 'Refresh wallets'}
        </button>
      </div>

      <div className="mt-5 max-h-[34rem] overflow-y-auto pr-1 sm:max-h-[36rem]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {chainOptions.map((chain) => {
            const wallet = walletByChain.get(chain.id)
            const balance = balances[chain.id]

            return (
              <article key={chain.id} className="rounded-md border border-arc/15 bg-haze p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-ink">{chain.label}</p>
                    <p className="mt-1 font-mono text-xs text-ink/55">{shortAddress(wallet?.walletAddress)}</p>
                    {wallet?.walletAddress ? (
                      <p className="mt-2 text-sm font-black text-ink">
                        {balanceStatus === 'loading' && !balance
                          ? 'Checking...'
                          : balance?.error
                          ? balance.error
                            : formatBalance(balance?.balance)}
                      </p>
                    ) : null}
                  </div>
                  {wallet ? <CheckCircle2 size={18} className="text-mint" /> : <WalletCards size={18} className="text-ink/35" />}
                </div>
                {wallet?.walletAddress ? (
                  <button
                    type="button"
                    onClick={() => copyAddress(wallet.walletAddress, chain.id)}
                    className="quid-secondary-action mt-3 h-8 px-2 text-xs"
                  >
                    <Copy size={13} /> {copied === String(chain.id) ? 'Copied' : 'Copy'}
                  </button>
                ) : status === 'loading' ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-arc">
                    <Loader2 size={13} className="animate-spin" /> Setting up
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-coral">Setup pending</p>
                )}
              </article>
            )
          })}
        </div>
      </div>

      {walletMocked ? <p className="mt-4 text-sm font-semibold text-coral">Live chain wallets need Circle env vars.</p> : null}
      {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
    </section>
  )
}
