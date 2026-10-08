'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const POLL_INTERVAL_MS = 5000

export function TransactionStatusSync({ hasSubmittedPayments = false, ownerId }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let reconciling = false
    let channel = null

    async function reconcile() {
      if (cancelled || reconciling || !hasSubmittedPayments) {
        return
      }

      reconciling = true

      try {
        const response = await fetch('/api/payments/reconcile', { method: 'POST' })
        const payload = await response.json().catch(() => ({}))

        if (!cancelled && response.ok && Number(payload.changed) > 0) {
          router.refresh()
        }
      } catch {
        // A later poll can recover from a temporary network or RPC failure.
      } finally {
        reconciling = false
      }
    }

    if (!hasSubmittedPayments || !ownerId) {
      return undefined
    }

    reconcile()
    const interval = window.setInterval(reconcile, POLL_INTERVAL_MS)

    try {
      const supabase = createSupabaseBrowserClient()
      channel = supabase
        .channel('quid-payment-statuses')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'quid_payments', filter: `owner_id=eq.${ownerId}` },
          () => router.refresh()
        )
        .subscribe()
    } catch {
      // Polling remains the fallback when Realtime is not configured yet.
    }

    return () => {
      cancelled = true
      window.clearInterval(interval)

      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [hasSubmittedPayments, ownerId, router])

  return null
}
