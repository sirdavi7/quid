import { NextResponse } from 'next/server'
import { reconcileSubmittedPaymentsForOwner } from '@/lib/payment-lifecycle'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeApiError, logServerError } from '@/lib/user-errors'

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ error: 'Sign in to update transaction status.' }, { status: 401 })
    }

    const result = await reconcileSubmittedPaymentsForOwner(data.user.id)

    return NextResponse.json({
      checked: result.checked,
      changed: result.changed
    })
  } catch (error) {
    logServerError('Reconcile owner payments', error)
    return NextResponse.json({
      error: getSafeApiError(error, { fallback: 'Quid could not update transaction status right now.' })
    }, { status: 500 })
  }
}
