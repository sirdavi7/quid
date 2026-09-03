'use client'

import { useState } from 'react'
import { AlertCircle, Database, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react'
import { ARC_TESTNET_ID } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'

function formatBalance(value) {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })
}

function friendlyPanelError(message) {
  const text = String(message || '').toLowerCase()

  if (text.includes('json') || text.includes('doctype') || text.includes('unexpected token')) {
    return 'Quid received an unreadable service response. Try again in a moment.'
  }

  if (text.includes('fetch failed') || text.includes('network')) {
    return 'Quid could not reach the wallet service. Try again in a moment.'
  }

  return message || 'Wallet action failed.'
}
function GatewayBalanceSummary({ result }) {
  if (!result) {
    return null
  }

  const depositor = Array.isArray(result.breakdown) ? result.breakdown[0] : null
  const total = result.totalConfirmedBalance ?? depositor?.totalConfirmed ?? '0'
  const chainBreakdown = depositor?.breakdown ?? result.breakdown ?? []
  const chainsWithBalance = chainBreakdown.filter((item) => Number(item.confirmedBalance) > 0)
  const visibleBreakdown = chainsWithBalance.length ? chainsWithBalance : chainBreakdown.slice(0, 4)

  return (
    <div className="mt-4 rounded-md border border-arc/20 bg-haze p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-arc">Gateway cross-chain balance</p>
          <p className="mt-1 text-3xl font-black text-ink">{formatBalance(total)} USDC</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-ink/60">
          <Database size={15} /> Advanced
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {visibleBreakdown.map((item) => (
          <div key={item.chain} className="rounded-md border border-ink/10 bg-white p-3">
            <p className="text-sm font-black text-ink">{item.chain}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">{formatBalance(item.confirmedBalance)} USDC</p>
          </div>
        ))}
      </div>

      {!chainsWithBalance.length ? (
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Gateway is separate from your received Arc wallet funds. It only shows USDC that has been moved into Circle Gateway for cross-chain spending.
        </p>
      ) : null}
    </div>
  )
}

function ReceivedWalletBalance({ result }) {
  if (!result) {
    return null
  }

  return (
    <div className="mt-4 rounded-md border border-arc/25 bg-haze p-4 shadow-[0_18px_50px_rgba(109,53,242,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-arc">Received USDC wallet</p>
          <p className="mt-1 text-3xl font-black text-ink">{formatBalance(result.balance)} USDC</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-arc/15 bg-white px-3 py-2 text-xs font-bold text-ink/60">
          <WalletCards size={15} /> {result.chain}
        </div>
      </div>
      <p className="mt-3 break-all font-mono text-xs text-ink/55">{result.walletAddress}</p>
    </div>
  )
}

export function CreatorWalletPanel({ page }) {
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('1.00')
  const [selectedSourceId, setSelectedSourceId] = useState(String(ARC_TESTNET_ID))
  const [wallets, setWallets] = useState(page.wallets ?? [])
  const [receivedBalance, setReceivedBalance] = useState(null)
  const [gatewayBalance, setGatewayBalance] = useState(null)
  const [sendResult, setSendResult] = useState('')
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const isBusy = Boolean(pendingAction)
  const selectedSource = chainOptions.find((option) => option.id === Number(selectedSourceId)) ?? chainOptions[0]
  const canWithdrawDirectly = selectedSource.id === ARC_TESTNET_ID
  const selectedWallet = wallets.find((wallet) => wallet.chainId === selectedSource.id)
  const selectedWalletAddress = selectedWallet?.walletAddress ?? (canWithdrawDirectly ? page.walletAddress : '')

  async function ensureChainWallets() {
    setError('')
    setPendingAction('wallet-setup')

    try {
      const response = await fetch('/api/page-wallets', {
        method: 'POST'
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Wallet setup failed.')
      }

      setWallets(payload.wallets ?? [])
      setSendResult(payload.created ? `Created ${payload.created} supported-chain wallet${payload.created === 1 ? '' : 's'} for this Quid page.` : 'Supported-chain wallets are already set up.')
    } catch (requestError) {
      setError(friendlyPanelError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function checkReceivedBalance() {
    setError('')
    setReceivedBalance(null)
    setPendingAction('received-balance')

    try {
      if (!selectedWalletAddress) {
        throw new Error(`Set up a ${selectedSource.label} wallet for this Quid page first.`)
      }

      const response = await fetch('/api/chain-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedWalletAddress,
          chainId: selectedSource.id
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Arc balance request failed.')
      }

      setReceivedBalance(payload)
    } catch (requestError) {
      setError(friendlyPanelError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function callUnifiedBalance(action) {
    setError('')
    setPendingAction(action === 'balances' ? 'gateway-balance' : action === 'deposit' ? 'gateway-deposit' : 'gateway-send')

    if (action === 'balances') {
      setGatewayBalance(null)
    } else {
      setSendResult('')
    }

    try {
      if (!selectedWalletAddress) {
        throw new Error(`Set up a ${selectedSource.label} wallet for this Quid page first.`)
      }

      const response = await fetch('/api/unified-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          recipientAddress,
          amount,
          sourceChainId: selectedSource.id
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Circle request failed.')
      }

      if (action === 'balances') {
        setGatewayBalance(payload.balances ?? payload.result ?? payload)
      } else if (action === 'deposit') {
        setSendResult(payload.result?.explorerUrl ? `Gateway deposit submitted: ${payload.result.explorerUrl}` : `${amount} USDC deposit to Gateway submitted from ${selectedSource.label}.`)
      } else {
        setSendResult(payload.result?.explorerUrl ? `Gateway withdrawal submitted: ${payload.result.explorerUrl}` : `Gateway withdrawal submitted from ${selectedSource.label} to Arc Testnet.`)
      }
    } catch (requestError) {
      setError(friendlyPanelError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function withdrawReceivedUsdc() {
    setError('')
    setSendResult('')
    setPendingAction('withdraw')

    try {
      if (!canWithdrawDirectly) {
        throw new Error(`${selectedSource.label} received-wallet withdrawals need Gateway routing before Quid can move those funds. Check the Gateway pooled balance or use Arc Testnet for direct withdrawal.`)
      }

      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddress,
          amount
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Withdrawal request failed.')
      }

      setSendResult(payload.result?.id ? `Withdrawal submitted. Circle transaction ID: ${payload.result.id}` : 'Withdrawal submitted from your received USDC wallet.')
    } catch (requestError) {
      setError(friendlyPanelError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-10">
      <div className="quid-card p-5">
        <h2 className="text-xl font-black text-ink">Withdraw received USDC</h2>
        <p className="mt-1 text-sm leading-6 text-ink/60">
          Owner-only controls for checking each chain receive wallet, moving non-Arc funds through Gateway, and withdrawing USDC to an Arc Testnet recipient.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_160px]">
          <input
            value={recipientAddress}
            onChange={(event) => setRecipientAddress(event.target.value)}
            className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="Recipient address"
          />
          <select
            value={selectedSourceId}
            onChange={(event) => {
              setSelectedSourceId(event.target.value)
              setReceivedBalance(null)
              setSendResult('')
              setError('')
            }}
            className="h-11 rounded-md border border-ink/15 px-3 font-semibold outline-none focus:border-arc"
          >
            {chainOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            inputMode="decimal"
          />
        </div>

        <div className="mt-3 rounded-md border border-arc/15 bg-haze px-3 py-2 text-sm text-ink/65">
          <span className="font-bold text-ink">{selectedSource.label} receive wallet: </span>
          {selectedWalletAddress ? (
            <span className="break-all font-mono text-xs">{selectedWalletAddress}</span>
          ) : (
            <span className="font-semibold text-coral">Not set up yet</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={ensureChainWallets}
            disabled={isBusy || page.walletMocked}
            className="quid-secondary-action h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
          >
            {pendingAction === 'wallet-setup' ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            Set up chain wallets
          </button>
          <button
            type="button"
            onClick={checkReceivedBalance}
            disabled={isBusy || page.walletMocked}
            className="quid-secondary-action h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
          >
            {pendingAction === 'received-balance' ? <Loader2 size={17} className="animate-spin" /> : null}
            Check received balance
          </button>
          <button
            type="button"
            onClick={() => callUnifiedBalance('balances')}
            disabled={isBusy || page.walletMocked}
            className="quid-secondary-action h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
          >
            {pendingAction === 'gateway-balance' ? <Loader2 size={17} className="animate-spin" /> : null}
            Check Gateway balance
          </button>
          <button
            type="button"
            onClick={() => callUnifiedBalance('deposit')}
            disabled={isBusy || page.walletMocked}
            className="quid-secondary-action h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
          >
            {pendingAction === 'gateway-deposit' ? <Loader2 size={17} className="animate-spin" /> : null}
            Deposit to Gateway
          </button>
          <button
            type="button"
            onClick={withdrawReceivedUsdc}
            disabled={isBusy || page.walletMocked || !canWithdrawDirectly}
            className="quid-primary-action h-11 px-4 disabled:cursor-not-allowed disabled:border-arc/15 disabled:from-haze disabled:to-haze disabled:text-arc/45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:from-haze disabled:hover:to-haze"
          >
            {pendingAction === 'withdraw' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            Withdraw Arc wallet
          </button>
          <button
            type="button"
            onClick={() => callUnifiedBalance('send')}
            disabled={isBusy || page.walletMocked}
            className="quid-primary-action h-11 px-4 disabled:cursor-not-allowed disabled:border-arc/15 disabled:from-haze disabled:to-haze disabled:text-arc/45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:from-haze disabled:hover:to-haze"
          >
            {pendingAction === 'gateway-send' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            Withdraw Gateway USDC
          </button>
        </div>

        {!canWithdrawDirectly ? (
          <p className="mt-4 rounded-md border border-arc/20 bg-haze px-3 py-2 text-sm font-semibold text-ink/70">
            {selectedSource.label} direct withdrawal uses Gateway. Deposit this source balance to Gateway first, then withdraw from Gateway to the recipient on Arc Testnet.
          </p>
        ) : null}

        <ReceivedWalletBalance result={receivedBalance} />
        <GatewayBalanceSummary result={gatewayBalance} />

        {sendResult ? (
          <p className="mt-4 break-words rounded-md border border-arc/20 bg-haze px-3 py-2 text-sm font-semibold text-ink">
            {sendResult}
          </p>
        ) : null}
        {page.walletMocked ? (
          <p className="mt-4 flex gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
            <AlertCircle size={18} /> Add Circle env vars to enable server-side wallet actions.
          </p>
        ) : null}
        {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      </div>
    </section>
  )
}
