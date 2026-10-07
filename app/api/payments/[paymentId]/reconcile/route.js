import { NextResponse } from 'next/server'
import { reconcilePaymentById } from '@/lib/payment-lifecycle'
import { getSafeApiError, logServerError } from '@/lib/user-errors'

function toPublicPayment(payment) {
  if (!payment) {
    return null
  }

  return {
    id: payment.id,
    status: payment.status,
    txHash: payment.txHash,
    explorerUrl: payment.explorerUrl,
    blockNumber: payment.blockNumber,
    confirmedAt: payment.confirmedAt,
    failureReason: payment.failureReason
  }
}

export async function POST(_request, { params }) {
  try {
    const result = await reconcilePaymentById(params.paymentId)

    if (!result) {
      return NextResponse.json({ error: 'Transaction record not found.' }, { status: 404 })
    }

    return NextResponse.json({ payment: toPublicPayment(result.payment), changed: result.changed })
  } catch (error) {
    logServerError('Reconcile payment', error)
    return NextResponse.json({
      error: getSafeApiError(error, { fallback: 'Quid could not update this transaction yet.' })
    }, { status: 500 })
  }
}
