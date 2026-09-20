'use client'

import { useState } from 'react'
import { ExternalLink, ReceiptText, X } from 'lucide-react'

function formatUsdc(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' USDC'
}

function fullAddress(address) {
  return address || 'Not available'
}

function formatDate(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function chainLabel(payment) {
  const source = payment.sourceChain || 'Arc Testnet'
  const destination = payment.destinationChain || 'Arc Testnet'

  return source === destination ? source : source + ' to ' + destination
}

function paymentType(payment) {
  const note = String(payment.note ?? '').toLowerCase()

  if (note.includes('gateway deposit')) return 'Gateway deposit'
  if (note.includes('connected')) return 'Connected wallet send'
  if (note.includes('direct')) return 'Direct withdrawal'
  if (payment.kind === 'outgoing') return 'Owner withdrawal'

  return 'Checkout payment'
}

function fromLabel(payment) {
  if (paymentType(payment) === 'Gateway deposit') {
    return '/pay/' + payment.pageUsername
  }

  return fullAddress(payment.payerAddress)
}

function toLabel(payment) {
  if (paymentType(payment) === 'Gateway deposit') {
    return 'Circle Gateway'
  }

  return payment.kind === 'outgoing'
    ? fullAddress(payment.recipientAddress)
    : '/pay/' + payment.pageUsername
}

function statusLabel(status) {
  return String(status ?? 'submitted').replace(/^./, (character) => character.toUpperCase())
}

export function PaymentReceiptButton({ payment, explorerUrl }) {
  const [open, setOpen] = useState(false)
  const rows = [
    ['Type', paymentType(payment)],
    ['Amount', formatUsdc(payment.amount)],
    ['From', fromLabel(payment)],
    ['To', toLabel(payment)],
    ['Source chain', payment.sourceChain || 'Arc Testnet'],
    ['Destination chain', payment.destinationChain || 'Arc Testnet'],
    ['Transaction hash', fullAddress(payment.txHash)],
    ['Block number', payment.blockNumber ?? 'Not supplied by Circle'],
    ['Status', statusLabel(payment.status)],
    ['Time', formatDate(payment.createdAt)]
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="quid-secondary-action h-8 gap-1 px-2 text-xs"
      >
        <ReceiptText size={13} /> Receipt
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-night/55 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={'payment-receipt-' + payment.id}
            className="my-6 w-full max-w-xl rounded-xl border border-arc/20 bg-paper p-5 shadow-glow sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-arc">Transaction receipt</p>
                <h3 id={'payment-receipt-' + payment.id} className="mt-1 text-2xl font-black text-ink">
                  {paymentType(payment)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-arc/20 bg-white text-ink"
                aria-label="Close receipt"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-arc/15 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xl font-black text-ink">Quid</p>
                <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-black uppercase text-ink">
                  {statusLabel(payment.status)}
                </span>
              </div>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-ink/45">
                {chainLabel(payment)}
              </p>
              <p className="mt-6 text-4xl font-black text-ink">
                {payment.kind === 'outgoing' ? '-' : '+'}{formatUsdc(payment.amount)}
              </p>

              <dl className="mt-6 divide-y divide-ink/10 text-sm">
                {rows.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="font-bold text-ink/55">{label}</dt>
                    <dd className="break-all font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="quid-primary-action mt-4 w-full"
              >
                Open explorer <ExternalLink size={15} />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
