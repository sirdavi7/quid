'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const POLL_INTERVAL_MS = 5000
const FALLBACK_REFRESH_MS = 60000
const REFRESH_DEBOUNCE_MS = 400
const RETURN_TO_TAB_MS = 15000

export function TransactionStatusSync({ hasSubmittedPayments = false, ownerId }) {
  const router = useRouter()

  useEffect(() => {
    if (!ownerId) {
      return undefined
    }

    let cancelled = false
    let reconciling = false
    let channel = null
    let realtimeConnected = false
    let refreshTimer = null
    let hiddenAt = null

    // Several events can arrive together; refresh the page data once.
    function scheduleRefresh() {
      if (cancelled || refreshTimer) {
        return
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null

        if (!cancelled) {
          router.refresh()
        }
      }, REFRESH_DEBOUNCE_MS)
    }

    async function reconcile() {
      if (cancelled || reconciling || !hasSubmittedPayments) {
        return
      }

      reconciling = true

      try {
        const response = await fetch('/api/payments/reconcile', { method: 'POST' })
        const payload = await response.json().catch(() => ({}))

        if (!cancelled && response.ok && Number(payload.changed) > 0) {
          scheduleRefresh()
        }
      } catch {
        // A later poll can recover from a temporary network or RPC failure.
      } finally {
        reconciling = false
      }
    }

    // Pending payments are reconciled on a short interval until they settle.
    let reconcileInterval = null

    if (hasSubmittedPayments) {
      reconcile()
      reconcileInterval = window.setInterval(reconcile, POLL_INTERVAL_MS)
    }

    // Always listen for new and changed payment records for this owner.
    try {
      const supabase = createSupabaseBrowserClient()
      channel = supabase
        .channel('quid-payment-records')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'quid_payments', filter: `owner_id=eq.${ownerId}` },
          scheduleRefresh
        )
        .subscribe((status) => {
          realtimeConnected = status === 'SUBSCRIBED'
        })
    } catch {
      // The quiet fallback below keeps the page current when Realtime is not configured.
    }

    // Without a live connection, refresh about once a minute while the tab is visible.
    const fallbackInterval = window.setInterval(() => {
      if (!realtimeConnected && document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }, FALLBACK_REFRESH_MS)

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }

      if (hiddenAt && Date.now() - hiddenAt > RETURN_TO_TAB_MS) {
        scheduleRefresh()
      }

      hiddenAt = null
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true

      if (reconcileInterval) {
        window.clearInterval(reconcileInterval)
      }

      window.clearInterval(fallbackInterval)
      window.clearTimeout(refreshTimer)
      document.removeEventListener('visibilitychange', handleVisibility)

      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [hasSubmittedPayments, ownerId, router])

  return null
}
