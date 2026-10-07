import { NextResponse } from 'next/server'
import { reconcileSubmittedPayments } from '@/lib/payment-lifecycle'
import { logServerError } from '@/lib/user-errors'

export const maxDuration = 60

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await reconcileSubmittedPayments()
    return NextResponse.json({ checked: result.checked, changed: result.changed })
  } catch (error) {
    logServerError('Scheduled payment reconciliation', error)
    return NextResponse.json({ error: 'Payment reconciliation did not complete.' }, { status: 500 })
  }
}
