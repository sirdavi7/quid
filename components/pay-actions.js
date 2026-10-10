'use client'

import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { UnifiedBalanceKit } from '@circle-fin/unified-balance-kit'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { formatUnits, isAddress, parseUnits } from 'viem'
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract
} from 'wagmi'
import { ARC_TESTNET_CHAIN, ARC_TESTNET_ID, ARC_USDC_ADDRESS, usdcAbi } from '@/lib/arc'
import { chainOptions } from '@/lib/chains'
import { getFriendlyUserError } from '@/lib/user-errors'
import { NetworkFeeSummary } from '@/components/network-fee-summary'
import { UsdcAmountInput, UsdcMark } from '@/components/usdc-mark'
import { PaymentStatusCard } from '@/components/payment-status-card'

const WalletConnectButton = dynamic(() => import('./wallet-connect-button'), {
  ssr: false,
  loading: () => (
    <button className="quid-primary-action opacity-70">
      Connect Wallet
    </button>
  )
})

function getQueryAmount(value) {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (!rawValue) {
    return null
  }

  const amount = Number(rawValue)

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
    return null
  }

  return String(rawValue)
}

function getQueryChainId(value) {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (!rawValue) {
    return null
  }

  const normalized = String(rawValue).trim().toLowerCase()
  const selected = chainOptions.find((option) => {
    const labelSlug = option.label.toLowerCase().replaceAll(' ', '-')

    return String(option.id) === normalized || option.gatewayName.toLowerCase() === normalized || labelSlug === normalized
  })

  return selected ? String(selected.id) : null
}

function formatFeeAmount(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return String(value ?? 'Unavailable')
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 15
  })
}

function gatewayFeeLabel(value) {
  const rawLabel = String(value ?? '').trim()

  if (!rawLabel) {
    return 'Gateway route fee'
  }

  const readable = rawLabel
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const capitalized = `${readable.charAt(0).toUpperCase()}${readable.slice(1)}`

  return /fee/i.test(capitalized) ? capitalized : `${capitalized} fee`
}

function quoteFeeItems(fees = []) {
  return fees
    .filter((fee) => fee?.amount !== undefined && fee?.token)
    .map((fee) => ({
      label: gatewayFeeLabel(fee.type),
      amount: formatFeeAmount(fee.amount),
      asset: fee.token
    }))
}

function feeLinesFromItems(items) {
  return items.map((item) => `${item.label}: ${item.amount} ${item.asset}`)
}

export function PayActions({ page, isOwner = false, initialAmount, initialChain }) {
  const { address, connector, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const arcPublicClient = usePublicClient({ chainId: ARC_TESTNET_ID })
  const kit = useMemo(() => new UnifiedBalanceKit(), [])

  const queryAmount = initialAmount
  const queryChain = initialChain
  const initialPaymentAmount = getQueryAmount(queryAmount) ?? '5.00'
  const initialSourceChainId = getQueryChainId(queryChain) ?? String(ARC_TESTNET_ID)
  const [payForm, setPayForm] = useState({
    amount: initialPaymentAmount,
    sourceChainId: initialSourceChainId
  })
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '1.00'
  })
  const [transaction, setTransaction] = useState(null)
  const [feePreview, setFeePreview] = useState({ state: 'idle' })
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const isBusy = Boolean(pendingAction)
  const selectedSource = useMemo(
    () => chainOptions.find((option) => option.id === Number(payForm.sourceChainId)) ?? chainOptions[0],
    [payForm.sourceChainId]
  )
  const isArcSource = selectedSource.id === ARC_TESTNET_ID

  useEffect(() => {
    const nextAmount = getQueryAmount(queryAmount)

    if (nextAmount) {
      setPayForm((current) => ({ ...current, amount: nextAmount }))
    }
  }, [queryAmount])

  useEffect(() => {
    const nextChainId = getQueryChainId(queryChain)

    if (nextChainId) {
      setPayForm((current) => ({ ...current, sourceChainId: nextChainId }))
    }
  }, [queryChain])

  const { data: sourceUsdcBalance } = useReadContract({
    address: selectedSource.usdcAddress,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: selectedSource.id,
    query: { enabled: Boolean(address && selectedSource.usdcAddress) }
  })
  const { data: sourceNativeBalance } = useBalance({
    address,
    chainId: selectedSource.id,
    query: { enabled: Boolean(address) }
  })
  const requestedPaymentAmount = useMemo(() => {
    try {
      const amount = Number(payForm.amount)

      if (!Number.isFinite(amount) || amount <= 0) {
        return null
      }

      return parseUnits(payForm.amount, 6)
    } catch {
      return null
    }
  }, [payForm.amount])
  const hasLowSourceUsdcBalance = Boolean(
    isConnected &&
      requestedPaymentAmount !== null &&
      sourceUsdcBalance !== undefined &&
      sourceUsdcBalance < requestedPaymentAmount
  )

  useEffect(() => {
    let cancelled = false
    const amount = Number(payForm.amount)

    if (!isConnected || !address || !isAddress(page.walletAddress) || !Number.isFinite(amount) || amount <= 0) {
      setFeePreview({ state: 'idle' })
      return undefined
    }

    if (!isArcSource && chainId !== selectedSource.id) {
      setFeePreview({
        state: 'network-needed',
        network: selectedSource.label,
        gasAsset: selectedSource.nativeSymbol,
        detail: `Switch your wallet to ${selectedSource.label} to load its live Gateway fee quote.`
      })
      return undefined
    }

    setFeePreview({
      state: 'loading',
      network: selectedSource.label,
      gasAsset: isArcSource ? 'USDC' : selectedSource.nativeSymbol
    })

    const timer = window.setTimeout(async () => {
      try {
        const adapter = isArcSource ? null : await getCurrentAdapter()
        const quote = await getPaymentFeeQuote(selectedSource, payForm.amount, adapter)

        if (!cancelled) {
          setFeePreview({ state: 'ready', ...quote })
        }
      } catch {
        if (!cancelled) {
          setFeePreview({
            state: 'unavailable',
            network: selectedSource.label,
            gasAsset: isArcSource ? 'USDC' : selectedSource.nativeSymbol,
            detail: 'Live fee quote is unavailable right now. Quid will not ask for a signature until it can retrieve one.'
          })
        }
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [address, chainId, connector, isArcSource, isConnected, page.walletAddress, payForm.amount, selectedSource])

  async function getAdapter(requiredChainId) {
    if (!connector) {
      throw new Error('Connect a wallet first.')
    }
    if (chainId !== requiredChainId) {
      await switchChainAsync({ chainId: requiredChainId })
    }
    const provider = await connector.getProvider()
    return createViemAdapterFromProvider({ provider })
  }

  async function getCurrentAdapter() {
    if (!connector) {
      throw new Error('Connect a wallet first.')
    }

    const provider = await connector.getProvider()
    return createViemAdapterFromProvider({ provider })
  }

  async function getArcFeeQuote(recipientAddress, amount) {
    if (!arcPublicClient || !address) {
      throw new Error('Quid could not estimate the Arc network fee yet.')
    }

    const [gas, gasPrice] = await Promise.all([
      arcPublicClient.estimateContractGas({
        address: ARC_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: 'transfer',
        args: [recipientAddress, parseUnits(amount, 6)],
        account: address
      }),
      arcPublicClient.getGasPrice()
    ])

    const feeItems = [{
      label: 'Network gas estimate',
      amount: formatFeeAmount(formatUnits(gas * gasPrice, 18)),
      asset: 'USDC'
    }]

    return {
      network: 'Arc Testnet',
      feeMode: 'native',
      feeAsset: 'USDC',
      gasAsset: 'USDC',
      feeItems,
      feeLines: feeLinesFromItems(feeItems),
      detail: 'Arc uses USDC for network gas. This is an estimate and is separate from the payment amount.'
    }
  }

  async function getGatewaySpendQuote(selected, adapter, amount) {
    const result = await kit.estimateSpend({
      from: {
        adapter,
        allocations: { amount, chain: selected.gatewayName }
      },
      to: {
        chain: ARC_TESTNET_CHAIN,
        recipientAddress: page.walletAddress,
        useForwarder: true
      },
      amount
    })
    const feeItems = quoteFeeItems(result?.fees)
    const feeAssets = [...new Set(feeItems.map((item) => item.asset).filter(Boolean))]

    return {
      network: selected.label,
      feeMode: 'gateway',
      feeAsset: feeAssets.join(' / ') || 'USDC',
      gasAsset: feeAssets.join(' / ') || 'USDC',
      feeItems,
      feeLines: feeItems.length ? feeLinesFromItems(feeItems) : ['No additional Gateway fee'],
      detail: feeItems.length
        ? 'Gateway quoted these route fees before the payment is submitted.'
        : 'Gateway did not quote an additional route fee for this payment.'
    }

  }

  async function getPaymentFeeQuote(selected, amount, adapter) {
    if (selected.id === ARC_TESTNET_ID) {
      return getArcFeeQuote(page.walletAddress, amount)
    }

    return getGatewaySpendQuote(selected, adapter, amount)
  }

  function paymentConfirmationMessage(quote, amount, recipientLabel) {
    return [
      `Send ${amount} USDC to ${recipientLabel}?`,
      `Network: ${quote.network}`,
      `Estimated fee: ${quote.feeLines.join(' + ')}`,
      quote.detail
    ].join('\n\n')
  }

  function getFriendlyError(message) {
    if (message?.includes('Insufficient total maxFee')) {
      return 'Gateway needs a tiny extra USDC amount to cover the forwarding fee. Lower the payment amount slightly or add more test USDC to the source balance.'
    }

    if (message?.includes('insufficient funds') || message?.includes('exceeds balance')) {
      return 'This wallet does not have enough USDC to complete the payment.'
    }

    return getFriendlyUserError(message, { fallback: 'We could not complete this payment. Check your wallet and try again.' })
  }

  async function savePaymentRecord(record, fallbackMessage) {
    let lastError = null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        })
        const payload = await response.json().catch(() => ({}))

        if (response.ok) {
          return payload.payment
        }

        lastError = new Error(payload.error ?? fallbackMessage)

        if (response.status !== 429 && response.status < 500) {
          break
        }
      } catch (error) {
        lastError = error
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }

    throw lastError ?? new Error(fallbackMessage)
  }

  async function recordSubmittedPayment({ selected, result }) {
    const txHash = result?.transactionHash ?? result?.txHash ?? result?.hash

    return savePaymentRecord({
      pageUsername: page.username,
      payerAddress: address,
      amount: payForm.amount,
      sourceChain: selected.label,
      destinationChain: 'Arc Testnet',
      explorerUrl: result?.explorerUrl ?? (String(txHash ?? '').startsWith('0x') ? `https://testnet.arcscan.app/tx/${txHash}` : null),
      txHash,
      operation: 'checkout',
      note: `Paid ${page.name}`
    }, 'Payment submitted, but Quid could not save the receipt yet.')
  }

  async function recordOutgoingConnectedWalletSend({ hash }) {
    return savePaymentRecord({
      pageUsername: page.username,
      payerAddress: address,
      recipientAddress: sendForm.recipient,
      amount: sendForm.amount,
      sourceChain: 'Arc Testnet',
      destinationChain: 'Arc Testnet',
      explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
      txHash: hash,
      kind: 'outgoing',
      operation: 'connected-wallet-send',
      note: 'Connected wallet send'
    }, 'Transfer submitted, but Quid could not save the record yet.')
  }

  async function payWithUnifiedBalance(event) {
    event.preventDefault()
    setTransaction(null)
    setError('')
    setPendingAction('pay')

    try {
      if (!isConnected) {
        throw new Error('Connect a wallet first.')
      }
      if (!page.walletAddress || !isAddress(page.walletAddress)) {
        throw new Error('This Quid page does not have a valid Arc recipient.')
      }

      const selected = chainOptions.find((option) => option.id === Number(payForm.sourceChainId))
      if (!selected) {
        throw new Error('Choose a supported source chain.')
      }

      const amount = Number(payForm.amount)
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
        throw new Error('Enter an amount between 0 and 100 USDC.')
      }

      let result

      if (selected.id === ARC_TESTNET_ID) {
        if (chainId !== ARC_TESTNET_ID) {
          await switchChainAsync({ chainId: ARC_TESTNET_ID })
        }

        const quote = await getPaymentFeeQuote(selected, payForm.amount)
        setFeePreview({ state: 'ready', ...quote })

        if (!window.confirm(paymentConfirmationMessage(quote, payForm.amount, `/pay/${page.username}`))) {
          return
        }

        const hash = await writeContractAsync({
          address: ARC_USDC_ADDRESS,
          abi: usdcAbi,
          functionName: 'transfer',
          args: [page.walletAddress, parseUnits(payForm.amount, 6)],
          chainId: ARC_TESTNET_ID
        })
        result = {
          hash,
          explorerUrl: `https://testnet.arcscan.app/tx/${hash}`
        }
      } else {
        const adapter = await getAdapter(selected.id)
        const quote = await getPaymentFeeQuote(selected, payForm.amount, adapter)
        setFeePreview({ state: 'ready', ...quote })

        if (!window.confirm(paymentConfirmationMessage(quote, payForm.amount, `/pay/${page.username}`))) {
          return
        }

        result = await kit.spend({
          from: {
            adapter,
            allocations: { amount: payForm.amount, chain: selected.gatewayName }
          },
          to: {
            chain: ARC_TESTNET_CHAIN,
            recipientAddress: page.walletAddress,
            useForwarder: true
          },
          amount: payForm.amount
        })
      }

      const payment = await recordSubmittedPayment({ selected, result })
      setTransaction(payment)
    } catch (payError) {
      setError(getFriendlyError(payError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function sendArcUsdc(event) {
    event.preventDefault()
    setTransaction(null)
    setError('')
    setPendingAction('send')

    try {
      if (!isConnected) {
        throw new Error('Connect a wallet first.')
      }
      if (!isAddress(sendForm.recipient)) {
        throw new Error('Enter a valid recipient address.')
      }

      const amount = Number(sendForm.amount)
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
        throw new Error('Enter an amount between 0 and 100 USDC.')
      }

      if (chainId !== ARC_TESTNET_ID) {
        await switchChainAsync({ chainId: ARC_TESTNET_ID })
      }

      const quote = await getArcFeeQuote(sendForm.recipient, sendForm.amount)

      if (!window.confirm(paymentConfirmationMessage(quote, sendForm.amount, sendForm.recipient))) {
        return
      }

      const hash = await writeContractAsync({
        address: ARC_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: 'transfer',
        args: [sendForm.recipient, parseUnits(sendForm.amount, 6)],
        chainId: ARC_TESTNET_ID
      })

      const payment = await recordOutgoingConnectedWalletSend({ hash })
      setTransaction(payment)
    } catch (sendError) {
      setError(getFriendlyError(sendError.message))
    } finally {
      setPendingAction('')
    }
  }

  return (
    <div className="grid gap-4">
      <div className="quid-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink/50">Connected wallet</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink/70">
              <span>{selectedSource.label} balance:</span>
              <UsdcMark />
              <span>
                {!isConnected ? 'Connect wallet' : sourceUsdcBalance === undefined ? 'Checking...' : `${Number(formatUnits(sourceUsdcBalance, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
              </span>
            </p>
            {isConnected && sourceNativeBalance ? (
              <p className="mt-1 text-xs font-semibold text-ink/45">
                {isArcSource ? (
                  'Gas view: same Arc USDC balance'
                ) : (
                  <>
                    Gas token: {Number(sourceNativeBalance.formatted).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}{' '}
                    {sourceNativeBalance.symbol || selectedSource.nativeSymbol}
                  </>
                )}
              </p>
            ) : null}
          </div>
          <WalletConnectButton />
        </div>
      </div>

      <form onSubmit={payWithUnifiedBalance} className="quid-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink">{isOwner ? 'Test your checkout' : `Pay ${page.name}`}</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {isOwner
                ? 'Run a sandbox payment into your Quid received wallet. Use a separate funded wallet when you want to test the payer experience.'
                : 'Choose an amount, connect a wallet, and send USDC to this Quid page.'}
            </p>
          </div>
          <Send className="text-arc" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-ink">Amount</span>
            <UsdcAmountInput
              value={payForm.amount}
              onChange={(event) => setPayForm((current) => ({ ...current, amount: event.target.value }))}
              className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
              inputMode="decimal"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-ink">Source chain</span>
            <select
              value={payForm.sourceChainId}
              onChange={(event) => setPayForm((current) => ({ ...current, sourceChainId: event.target.value }))}
              className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            >
              {chainOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {feePreview.state === 'ready' ? (
          <NetworkFeeSummary className="mt-4" quote={feePreview} amount={payForm.amount} amountLabel="Payment amount" />
        ) : (
          <div className="mt-4 rounded-md border border-arc/15 bg-haze/70 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase text-arc">Network and fee</p>
              <p className="text-xs font-bold text-ink/55">
                {feePreview.network ?? selectedSource.label} - {feePreview.feeMode === 'gateway'
                  ? `Gateway fees: ${feePreview.feeAsset ?? 'USDC'}`
                  : `Gas: ${feePreview.gasAsset ?? (isArcSource ? 'USDC' : selectedSource.nativeSymbol)}`}
              </p>
            </div>
            {feePreview.state === 'loading' ? (
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink/60">
                <Loader2 size={15} className="animate-spin" /> Checking live fee quote
              </p>
            ) : null}
            {['network-needed', 'unavailable'].includes(feePreview.state) ? (
              <p className="mt-2 text-xs leading-5 text-ink/60">{feePreview.detail}</p>
            ) : null}
            {feePreview.state === 'idle' ? (
              <p className="mt-2 text-xs leading-5 text-ink/60">Connect a wallet and enter an amount to load the current fee.</p>
            ) : null}
          </div>
        )}

        <button
          disabled={isBusy}
          className="quid-primary-action mt-4 h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pendingAction === 'pay' ? <Loader2 size={17} className="animate-spin" /> : null}
          {isOwner ? 'Run test payment' : `Pay ${page.name}`}
        </button>
        {hasLowSourceUsdcBalance ? (
          <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
            This wallet has less USDC on {selectedSource.label} than the entered amount. Add {selectedSource.label} test USDC or choose a funded source chain.
          </p>
        ) : null}
      </form>

      {isOwner ? (
        <form onSubmit={sendArcUsdc} className="quid-card p-4">
          <h2 className="text-xl font-black text-ink">Send from connected wallet</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">Move Arc Testnet USDC from the wallet currently connected in your browser.</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">Recipient</span>
              <input
                value={sendForm.recipient}
                onChange={(event) => setSendForm((current) => ({ ...current, recipient: event.target.value }))}
                className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
                placeholder="0x..."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">Amount</span>
            <UsdcAmountInput
              value={sendForm.amount}
              onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))}
              className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
                inputMode="decimal"
              />
            </label>
          </div>
          <button
            disabled={isBusy}
            className="quid-primary-action mt-4 h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {pendingAction === 'send' ? <Loader2 size={17} className="mr-2 animate-spin" /> : null}
            Send USDC
          </button>
        </form>
      ) : null}

      <PaymentStatusCard initialPayment={transaction} />
      {error ? (
        <p className="flex gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          <AlertCircle size={18} /> {error}
        </p>
      ) : null}
    </div>
  )
}
