'use client'

import { useState } from 'react'
import { AlertCircle, Database, Loader2, RefreshCw, Send, WalletCards } from 'lucide-react'
import { ARC_TESTNET_ID } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'
import { getFriendlyUserError } from '@/lib/user-errors'
import { UsdcAmountInput, UsdcMark } from '@/components/usdc-mark'

function formatBalance(value) {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return '0.00'
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function friendlyPanelError(error, options) {
  return getFriendlyUserError(error, options)
}
function GatewayBalancesByWallet({ items }) {
  if (!items) {
    return null
  }

  return (
    <div className="mt-4 rounded-md border border-arc/20 bg-haze p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-arc">Gateway balances by receive wallet</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">See every Quid Gateway balance at once. Each balance remains owned by its receive wallet.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-ink/60">
          <Database size={15} /> Advanced
        </div>
      </div>

      <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {items.map((item) => {
          const depositor = Array.isArray(item.balances?.breakdown) ? item.balances.breakdown[0] : null
          const total = item.balances?.totalConfirmedBalance ?? depositor?.totalConfirmed ?? '0'

          return (
            <div key={item.walletAddress} className="rounded-md border border-ink/10 bg-white p-3">
              <p className="text-sm font-black text-ink">{item.chainLabels.join(', ')}</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-black text-ink"><UsdcMark />{formatBalance(total)} USDC</p>
              <p className="mt-2 break-all font-mono text-xs text-ink/50">{item.walletAddress}</p>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-ink/55">
        Gateway balances are not merged here. Select the receive wallet that owns a balance before withdrawing Gateway USDC.
      </p>
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
          <p className="mt-1 flex items-center gap-2 text-3xl font-black text-ink"><UsdcMark className="h-7 w-7" />{formatBalance(result.balance)} USDC</p>
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
  const [gatewayBalances, setGatewayBalances] = useState(null)
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
      setError(friendlyPanelError(requestError, { fallback: 'Quid could not set up the supported chain wallets. Try again in a moment.' }))
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
      setError(friendlyPanelError(requestError, { chainLabel: selectedSource.label, fallback: 'This received wallet balance is unavailable right now. Try again in a moment.' }))
    } finally {
      setPendingAction('')
    }
  }

  async function callUnifiedBalance(action) {
    setError('')
    setPendingAction(action === 'balances' ? 'gateway-balance' : action === 'deposit' ? 'gateway-deposit' : 'gateway-send')

    if (action === 'balances') {
      setGatewayBalances(null)
    } else {
      setSendResult('')
    }

    try {
      if (action !== 'balances' && !selectedWalletAddress) {
        throw new Error(`Set up a ${selectedSource.label} wallet for this Quid page first.`)
      }

      if (action === 'deposit' && !window.confirm(`Deposit ${amount} USDC from the ${selectedSource.label} receive wallet into its Gateway balance?`)) {
        return
      }

      if (action === 'send' && !window.confirm(`Withdraw ${amount} USDC from the ${selectedSource.label} Gateway balance to the recipient address on Arc Testnet?`)) {
        return
      }

      const response = await fetch('/api/unified-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          recipientAddress,
          amount,
          sourceChainId: selectedSource.id,
          confirmed: action === 'deposit' || action === 'send'
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Circle request failed.')
      }

      if (action === 'balances') {
        setGatewayBalances(payload.walletBalances ?? [])
      } else if (action === 'deposit') {
        setSendResult(payload.result?.explorerUrl ? `Gateway deposit submitted: ${payload.result.explorerUrl}` : `${amount} USDC was deposited from ${selectedSource.label} into its Gateway balance.`)
      } else {
        setSendResult(payload.result?.explorerUrl ? `Gateway withdrawal submitted: ${payload.result.explorerUrl}` : `Gateway withdrawal submitted from ${selectedSource.label} to Arc Testnet.`)
      }
    } catch (requestError) {
      setError(friendlyPanelError(requestError, {
        operation: action === 'deposit' ? 'gateway-deposit' : 'gateway-action',
        chainLabel: selectedSource.label,
        nativeSymbol: selectedSource.nativeSymbol,
        fallback: action === 'send' ? 'We could not submit this Gateway withdrawal. Check your Gateway balance, then try again.' : undefined
      }))
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
      setError(friendlyPanelError(requestError, { fallback: 'We could not submit this Arc withdrawal. Check the recipient and wallet balance, then try again.' }))
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
          <UsdcAmountInput
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

        <div className="mt-6 border-y border-arc/15">
          <div className="grid divide-y divide-arc/15 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
            <div className="py-5 xl:pr-5">
              <p className="text-xs font-black uppercase text-arc">Wallet</p>
              <p className="mt-1 text-sm font-black text-ink">Receive wallet setup</p>
              <button
                type="button"
                onClick={ensureChainWallets}
                disabled={isBusy || page.walletMocked}
                className="quid-secondary-action mt-4 h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
              >
                {pendingAction === 'wallet-setup' ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                Set up chain wallets
              </button>
            </div>

            <div className="py-5 xl:px-5">
              <p className="text-xs font-black uppercase text-arc">Balances</p>
              <p className="mt-1 text-sm font-black text-ink">Confirm available USDC</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <button
                  type="button"
                  onClick={checkReceivedBalance}
                  disabled={isBusy || page.walletMocked}
                  className="quid-secondary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
                >
                  {pendingAction === 'received-balance' ? <Loader2 size={17} className="animate-spin" /> : null}
                  Check receive wallet
                </button>
                <button
                  type="button"
                  onClick={() => callUnifiedBalance('balances')}
                  disabled={isBusy || page.walletMocked}
                  className="quid-secondary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
                >
                  {pendingAction === 'gateway-balance' ? <Loader2 size={17} className="animate-spin" /> : null}
                  Check Gateway balances
                </button>
              </div>
            </div>

            <div className="py-5 xl:pl-5">
              <p className="text-xs font-black uppercase text-arc">Transfer</p>
              <p className="mt-1 text-sm font-black text-ink">
                {canWithdrawDirectly ? 'Move from the received wallet' : 'Route this balance through Gateway'}
              </p>
              <div className="mt-4 grid gap-2">
                {canWithdrawDirectly ? (
                  <button
                    type="button"
                    onClick={withdrawReceivedUsdc}
                    disabled={isBusy || page.walletMocked}
                    className="quid-primary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:border-arc/15 disabled:from-haze disabled:to-haze disabled:text-arc/45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:from-haze disabled:hover:to-haze"
                  >
                    {pendingAction === 'withdraw' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    Withdraw received USDC
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => callUnifiedBalance('deposit')}
                    disabled={isBusy || page.walletMocked}
                    className="quid-primary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:border-arc/15 disabled:from-haze disabled:to-haze disabled:text-arc/45 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:from-haze disabled:hover:to-haze"
                  >
                    {pendingAction === 'gateway-deposit' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    Deposit to Gateway
                  </button>
                )}
                {canWithdrawDirectly ? (
                  <button
                    type="button"
                    onClick={() => callUnifiedBalance('deposit')}
                    disabled={isBusy || page.walletMocked}
                    className="quid-secondary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
                  >
                    {pendingAction === 'gateway-deposit' ? <Loader2 size={17} className="animate-spin" /> : null}
                    Deposit to Gateway
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => callUnifiedBalance('send')}
                  disabled={isBusy || page.walletMocked}
                  className="quid-secondary-action h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-panel"
                >
                  {pendingAction === 'gateway-send' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  Withdraw Gateway USDC
                </button>
              </div>
            </div>
          </div>
        </div>

        {!canWithdrawDirectly ? (
          <p className="mt-4 rounded-md border border-arc/20 bg-haze px-3 py-2 text-sm font-semibold text-ink/70">
            {selectedSource.label} direct withdrawal uses Gateway. Deposit this source balance to Gateway first, then withdraw from that wallet's Gateway balance to the recipient on Arc Testnet. This Circle wallet also needs test {selectedSource.nativeSymbol} for the Gateway deposit fee.
          </p>
        ) : null}

        <ReceivedWalletBalance result={receivedBalance} />
        <GatewayBalancesByWallet items={gatewayBalances} />

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
