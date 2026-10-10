import { createPublicClient, formatUnits, http } from 'viem'
import { chains } from '@/lib/chains'
import { getExplorerUrlForChain } from '@/lib/circleWallets'
import { getServerRpcUrl } from '@/lib/server-rpc'

function transactionHash(transaction) {
  const hash = transaction?.txHash ?? transaction?.transactionHash ?? transaction?.hash
  return String(hash ?? '').startsWith('0x') ? hash : null
}

export function normalizeFeeEvidence(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []
}

export function createNativeGasEvidence({ label, transaction, chainId, asset }) {
  const txHash = transactionHash(transaction)

  return {
    kind: 'native-gas',
    label,
    asset,
    transactionId: transaction?.id ?? null,
    txHash,
    explorerUrl: transaction?.explorerUrl ?? (txHash ? getExplorerUrlForChain(chainId, txHash) : null),
    state: transaction?.state ?? 'submitted',
    blockNumber: transaction?.blockNumber ? String(transaction.blockNumber) : null,
    actualGasPaid: null
  }
}

function hasActualGas(item) {
  return item.actualGasPaid !== undefined && item.actualGasPaid !== null && item.actualGasPaid !== ''
}

function receiptGasPaid(receipt, decimals) {
  const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice

  if (typeof receipt.gasUsed !== 'bigint' || typeof gasPrice !== 'bigint') {
    return null
  }

  return formatUnits(receipt.gasUsed * gasPrice, decimals)
}

export function updateCircleFeeEvidence({ feeEvidence, transactionId, transaction, chainId, asset, fallbackLabel }) {
  const evidence = normalizeFeeEvidence(feeEvidence)
  const txHash = transactionHash(transaction)
  const update = (item) => ({
    ...item,
    asset: item.asset ?? asset,
    txHash: txHash ?? item.txHash ?? null,
    explorerUrl: transaction?.explorerUrl ?? item.explorerUrl ?? (txHash ? getExplorerUrlForChain(chainId, txHash) : null),
    state: transaction?.state ?? item.state ?? 'submitted',
    blockNumber: transaction?.blockNumber ? String(transaction.blockNumber) : (item.blockNumber ?? null)
  })
  const matched = evidence.some((item) => item.transactionId && item.transactionId === transactionId)

  if (matched) {
    return evidence.map((item) => item.transactionId === transactionId ? update(item) : item)
  }

  if (!transactionId && !txHash) {
    return evidence
  }

  return [...evidence, update({
    kind: 'native-gas',
    label: fallbackLabel,
    asset,
    transactionId: transactionId ?? null,
    txHash: null,
    explorerUrl: null,
    state: 'submitted',
    blockNumber: null,
    actualGasPaid: null
  })]
}

export async function hydrateNativeGasEvidence({ feeEvidence, chainId }) {
  const evidence = normalizeFeeEvidence(feeEvidence)
  const needsReceipt = evidence.some((item) => (
    item.kind === 'native-gas' &&
    String(item.txHash ?? '').startsWith('0x') &&
    !hasActualGas(item)
  ))

  if (!needsReceipt) {
    return evidence
  }

  const chain = chains.find((item) => item.id === Number(chainId))
  const rpcUrl = getServerRpcUrl(chainId)

  if (!chain || !rpcUrl) {
    return evidence
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl) })

  return Promise.all(evidence.map(async (item) => {
    if (item.kind !== 'native-gas' || !String(item.txHash ?? '').startsWith('0x') || hasActualGas(item)) {
      return item
    }

    try {
      const receipt = await client.getTransactionReceipt({ hash: item.txHash })
      const decimals = chain.nativeCurrency?.decimals ?? 18

      return {
        ...item,
        blockNumber: receipt.blockNumber.toString(),
        state: receipt.status === 'success' ? 'confirmed' : 'failed',
        actualGasPaid: receiptGasPaid(receipt, decimals)
      }
    } catch {
      return item
    }
  }))
}
