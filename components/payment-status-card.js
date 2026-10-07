'use client'

import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const CHECK_INTERVAL_MS = 4000

function statusCopy(payment) {
  if (payment.status === 'confirmed') {
    return 'Confirmed on-chain and recorded by Quid.'
  }

  if (payment.status === 'failed') {
    return payment.failureReason || 'This transaction could not be completed.'
  }

  if (payment.circleTransactionId) {
    return 'Submitted to Circle. Quid is checking for final confirmation.'
  }

  return 'Submitted to the network. Quid is checking for final confirmation.'
}

function statusIcon(status) {
  if (status === 'confirmed') return <CheckCircle2 className="shrink-0 text-mint" size={19} />
  if (status === 'failed') return <AlertCircle className="shrink-0 text-red-600 dark:text-red-300" size={19} />

  return <Loader2 className="shrink-0 animate-spin text-arc" size={19} />
}

export function PaymentStatusCard({ initialPayment }) {
  const [payment, setPayment] = useState(initialPayment)

  useEffect(() => {
    setPayment(initialPayment)
  }, [initialPayment])

  useEffect(() => {
    if (!payment?.id || payment.status !== 'submitted') {
      return undefined
    }

    let cancelled = false

    async function checkStatus() {
      try {
        const response = await fetch(`/api/payments/${payment.id}/reconcile`, { method: 'POST' })
        const payload = await response.json().catch(() => ({}))

        if (!cancelled && response.ok && payload.payment) {
          setPayment((current) => ({ ...current, ...payload.payment }))
        }
      } catch {
        // Keep the pending state visible and try again on the next interval.
      }
    }

    checkStatus()
    const interval = window.setInterval(checkStatus, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [payment?.id, payment?.status])

  if (!payment) {
    return null
  }

  const pending = payment.status === 'submitted'
  const failed = payment.status === 'failed'

  return (
    <div
      className={`rounded-md border p-4 ${
        failed
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100'
          : 'border-arc/20 bg-haze text-ink'
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {statusIcon(payment.status)}
          <div>
            <p className="font-black">
              {pending ? 'Transaction pending' : failed ? 'Transaction failed' : 'Transaction confirmed'}
            </p>
            <p className="mt-1 text-sm leading-6 opacity-75">{statusCopy(payment)}</p>
          </div>
        </div>
        {payment.explorerUrl ? (
          <a href={payment.explorerUrl} target="_blank" rel="noreferrer" className="quid-secondary-action h-9 shrink-0 gap-1 px-3 text-xs">
            Explorer <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </div>
  )
}
