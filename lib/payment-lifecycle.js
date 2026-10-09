import { createPublicClient, http } from 'viem'
import { chains, chainOptions } from '@/lib/chains'
import { getCircleTransactionDetails, getExplorerUrlForChain, isCompletedCircleTransaction, isFailedCircleTransaction } from '@/lib/circleWallets'
import { getServerRpcUrl } from '@/lib/server-rpc'
import {
  getPaymentById,
  listSubmittedPayments,
  listSubmittedPaymentsForOwner,
  updatePaymentLifecycle,
  upsertWalletActivityRecords
} from '@/lib/store'

function paymentChainOption(payment) {
  const labels = [payment.destinationChain, payment.sourceChain]

  for (const label of labels) {
    const option = chainOptions.find((item) => item.label.toLowerCase() === String(label ?? '').toLowerCase())

    if (option) {
      return option
    }
  }

  return chainOptions[0]
}

function explorerUrlForPayment(payment, chainId, txHash) {
  return getExplorerUrlForChain(chainId, txHash) ?? payment.explorerUrl
}

function failureMessage(value, fallback) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message
  }

  return fallback
}

function changedFields(payment, candidate) {
  return Object.fromEntries(
    Object.entries(candidate).filter(([key, value]) => value !== undefined && payment[key] !== value)
  )
}

async function createConfirmedWalletActivity(payment) {
  if (!payment.txHash?.startsWith('0x')) {
    return
  }

  const operation = String(payment.operation ?? '')
  let source = null

  if (payment.kind === 'incoming' && operation === 'checkout') {
    source = 'Checkout payment'
  } else if (operation === 'gateway-deposit') {
    source = 'Gateway deposit'
  } else if (operation === 'direct-withdrawal') {
    source = 'Direct withdrawal'
  } else if (operation === 'gateway-withdrawal') {
    source = 'Gateway withdrawal'
  }

  if (!source) {
    return
  }

  await upsertWalletActivityRecords([{
    pageId: payment.pageId,
    ownerId: payment.ownerId,
    pageUsername: payment.pageUsername,
    // Incoming checkout activity belongs to Quid's receive wallet. Outgoing
    // movements remain associated with the wallet that initiated the transfer.
    walletAddress: payment.kind === 'incoming' ? payment.recipientAddress : payment.payerAddress,
    fromAddress: payment.payerAddress,
    toAddress: payment.recipientAddress,
    amount: payment.amount,
    asset: payment.asset ?? 'USDC',
    chain: payment.destinationChain ?? payment.sourceChain ?? 'Arc Testnet',
    txHash: payment.txHash,
    explorerUrl: payment.explorerUrl,
    source,
    blockNumber: payment.blockNumber,
    happenedAt: payment.confirmedAt ?? new Date().toISOString()
  }])
}

async function reconcileCirclePayment(payment, option) {
  const circle = await getCircleTransactionDetails(payment.circleTransactionId, option.id)
  const txHash = circle.txHash ?? payment.txHash ?? null
  const fields = changedFields(payment, {
    txHash,
    explorerUrl: txHash ? explorerUrlForPayment(payment, option.id, txHash) : payment.explorerUrl,
    blockNumber: circle.blockNumber ? String(circle.blockNumber) : payment.blockNumber,
    circleState: circle.state ?? payment.circleState
  })

  if (isFailedCircleTransaction(circle.state)) {
    fields.status = 'failed'
    fields.failureReason = failureMessage(
      circle.failureReason ?? circle.errorMessage ?? circle.error,
      'Circle could not complete this transaction.'
    )
  } else if (isCompletedCircleTransaction(circle.state) && String(txHash ?? '').startsWith('0x')) {
    fields.status = 'confirmed'
    fields.confirmedAt = payment.confirmedAt ?? new Date().toISOString()
  }

  if (!Object.keys(fields).length) {
    return { payment, changed: false }
  }

  const updated = await updatePaymentLifecycle(payment.id, fields)

  if (updated.status === 'confirmed') {
    await createConfirmedWalletActivity(updated)
  }

  return { payment: updated, changed: true }
}

async function reconcileEvmPayment(payment, option) {
  if (!String(payment.txHash ?? '').startsWith('0x')) {
    return { payment, changed: false }
  }

  const chain = chains.find((item) => item.id === option.id)
  const rpcUrl = getServerRpcUrl(option.id)

  if (!chain || !rpcUrl) {
    return { payment, changed: false }
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl)
  })

  let receipt

  try {
    receipt = await client.getTransactionReceipt({ hash: payment.txHash })
  } catch (error) {
    const message = String(error?.message ?? error ?? '').toLowerCase()

    if (message.includes('not found') || message.includes('could not be found') || message.includes('transactionreceipt')) {
      return { payment, changed: false }
    }

    throw error
  }

  let confirmedAt = payment.confirmedAt ?? null

  try {
    const block = await client.getBlock({ blockNumber: receipt.blockNumber })
    confirmedAt = new Date(Number(block.timestamp) * 1000).toISOString()
  } catch {
    // Receipt status is still enough to update the lifecycle. Keep the
    // database timestamp if a slow RPC cannot return the block immediately.
  }

  const isSuccess = receipt.status === 'success'
  const fields = changedFields(payment, {
    explorerUrl: explorerUrlForPayment(payment, option.id, payment.txHash),
    blockNumber: receipt.blockNumber.toString(),
    status: isSuccess ? 'confirmed' : 'failed',
    confirmedAt: isSuccess ? (confirmedAt ?? new Date().toISOString()) : payment.confirmedAt,
    failureReason: isSuccess ? null : `The transaction reverted on ${option.label}.`
  })

  const updated = await updatePaymentLifecycle(payment.id, fields)

  if (updated.status === 'confirmed') {
    await createConfirmedWalletActivity(updated)
  }

  return { payment: updated, changed: true }
}

export async function reconcilePayment(payment) {
  if (!payment || payment.status !== 'submitted') {
    return { payment, changed: false }
  }

  const option = paymentChainOption(payment)

  if (payment.circleTransactionId) {
    return reconcileCirclePayment(payment, option)
  }

  return reconcileEvmPayment(payment, option)
}

export async function reconcilePaymentById(paymentId) {
  const payment = await getPaymentById(paymentId)

  if (!payment) {
    return null
  }

  return reconcilePayment(payment)
}

async function reconcilePaymentBatch(payments) {
  const results = await Promise.allSettled(payments.map((payment) => reconcilePayment(payment)))
  const reconciled = results
    .filter((result) => result.status === 'fulfilled' && result.value?.payment)
    .map((result) => result.value)

  return {
    checked: payments.length,
    changed: reconciled.filter((result) => result.changed).length,
    payments: reconciled.map((result) => result.payment)
  }
}

export async function reconcileSubmittedPaymentsForOwner(ownerId, limit = 30) {
  const payments = await listSubmittedPaymentsForOwner(ownerId, limit)
  return reconcilePaymentBatch(payments)
}

export async function reconcileSubmittedPayments(limit = 100) {
  const payments = await listSubmittedPayments(limit)
  return reconcilePaymentBatch(payments)
}
