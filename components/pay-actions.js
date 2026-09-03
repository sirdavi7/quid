'use client'

import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { UnifiedBalanceKit } from '@circle-fin/unified-balance-kit'
import { AlertCircle, ExternalLink, Loader2, Send } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
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

const WalletConnectButton = dynamic(() => import('./wallet-connect-button'), {
  ssr: false,
  loading: () => (
    <button className="quid-primary-action opacity-70">
      Connect Wallet
    </button>
  )
})

export function PayActions({ page, isOwner = false }) {
  const { address, connector, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const arcPublicClient = usePublicClient({ chainId: ARC_TESTNET_ID })
  const kit = useMemo(() => new UnifiedBalanceKit(), [])

  const [payForm, setPayForm] = useState({
    amount: '5.00',
    sourceChainId: String(ARC_TESTNET_ID)
  })
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '1.00'
  })
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const isBusy = Boolean(pendingAction)
  const selectedSource = useMemo(
    () => chainOptions.find((option) => option.id === Number(payForm.sourceChainId)) ?? chainOptions[0],
    [payForm.sourceChainId]
  )
  const isArcSource = selectedSource.id === ARC_TESTNET_ID

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

  function getFriendlyError(message) {
    if (message?.includes('Insufficient total maxFee')) {
      return 'Gateway needs a tiny extra USDC amount to cover the forwarding fee. Lower the payment amount slightly or add more test USDC to the source balance.'
    }

    if (message?.includes('insufficient funds') || message?.includes('exceeds balance')) {
      return 'This wallet does not have enough USDC to complete the payment.'
    }

    return message ?? 'Payment failed.'
  }

  function shortAddress(value) {
    if (!value) return 'recipient'
    return `${value.slice(0, 6)}...${value.slice(-4)}`
  }

  async function recordSubmittedPayment({ selected, result }) {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageUsername: page.username,
        payerAddress: address,
        amount: payForm.amount,
        sourceChain: selected.label,
        explorerUrl: result?.explorerUrl,
        txHash: result?.transactionHash ?? result?.hash,
        note: `Paid ${page.name}`
      })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error ?? 'Payment submitted, but Quid could not save the receipt yet.')
    }
  }

  async function recordOutgoingConnectedWalletSend({ hash }) {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageUsername: page.username,
        payerAddress: address,
        recipientAddress: sendForm.recipient,
        amount: sendForm.amount,
        sourceChain: 'Arc Testnet',
        destinationChain: 'Arc Testnet',
        explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
        txHash: hash,
        kind: 'outgoing',
        note: 'Connected wallet send'
      })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error ?? 'Transfer submitted, but Quid could not save the record yet.')
    }
  }

  async function waitForArcTransferReceipt(hash) {
    if (!arcPublicClient) {
      throw new Error('Arc RPC is still getting ready. Try the payment again in a moment.')
    }

    const receipt = await arcPublicClient.waitForTransactionReceipt({ hash })

    if (receipt.status !== 'success') {
      throw new Error('Arc transaction failed before confirmation.')
    }

    return receipt
  }

  async function payWithUnifiedBalance(event) {
    event.preventDefault()
    setSuccess(null)
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

        const hash = await writeContractAsync({
          address: ARC_USDC_ADDRESS,
          abi: usdcAbi,
          functionName: 'transfer',
          args: [page.walletAddress, parseUnits(payForm.amount, 6)],
          chainId: ARC_TESTNET_ID
        })
        await waitForArcTransferReceipt(hash)
        result = {
          hash,
          explorerUrl: `https://testnet.arcscan.app/tx/${hash}`
        }
      } else {
        const adapter = await getAdapter(selected.id)
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

      await recordSubmittedPayment({ selected, result })
      const didWaitForArcReceipt = selected.id === ARC_TESTNET_ID
      setSuccess({
        title: didWaitForArcReceipt ? 'Payment confirmed' : 'Payment submitted',
        detail: `USDC payment to /pay/${page.username} was ${didWaitForArcReceipt ? 'confirmed' : 'sent'} and saved to the creator dashboard.`,
        url: result?.explorerUrl,
        linkLabel: selected.id === ARC_TESTNET_ID ? 'View on ArcScan' : 'View transaction'
      })
    } catch (payError) {
      setError(getFriendlyError(payError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function sendArcUsdc(event) {
    event.preventDefault()
    setSuccess(null)
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

      const hash = await writeContractAsync({
        address: ARC_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: 'transfer',
        args: [sendForm.recipient, parseUnits(sendForm.amount, 6)],
        chainId: ARC_TESTNET_ID
      })

      await waitForArcTransferReceipt(hash)
      await recordOutgoingConnectedWalletSend({ hash })
      setSuccess({
        title: 'Arc transfer confirmed',
        detail: `USDC was confirmed to ${shortAddress(sendForm.recipient)} and recorded in Quid money movement.`,
        url: `https://testnet.arcscan.app/tx/${hash}`,
        linkLabel: 'View on ArcScan'
      })
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
            <p className="mt-1 text-sm text-ink/70">
              {selectedSource.label} USDC balance:{' '}
              {!isConnected ? 'Connect wallet' : sourceUsdcBalance === undefined ? 'Checking...' : `${formatUnits(sourceUsdcBalance, 6)} USDC`}
            </p>
            {isConnected && sourceNativeBalance ? (
              <p className="mt-1 text-xs font-semibold text-ink/45">
                {isArcSource ? (
                  'Gas view: same Arc USDC balance'
                ) : (
                  <>
                    Gas token: {Number(sourceNativeBalance.formatted).toLocaleString(undefined, {
                      maximumFractionDigits: 6
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
            <input
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
              <input
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

      {success ? (
        <div className="rounded-md border border-mint/30 bg-mint/20 px-3 py-3 text-sm text-ink">
          <p className="font-black">{success.title}</p>
          <p className="mt-1 break-words font-semibold text-ink/65">{success.detail}</p>
          {success.url ? (
            <a href={success.url} target="_blank" rel="noreferrer" className="quid-secondary-action mt-3 h-9 w-fit gap-1 px-3 text-xs">
              {success.linkLabel} <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="flex gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          <AlertCircle size={18} /> {error}
        </p>
      ) : null}
    </div>
  )
}
