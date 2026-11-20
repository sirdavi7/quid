import { formatUnits } from 'viem'

// Reads a wallet's incoming USDC transfer history from the Arc explorer API
// (Blockscout v2), newest first. Used to catch transfers that arrived while
// nobody had the dashboard open.
const DEFAULT_EXPLORER_API_URL = 'https://explorer.testnet.arc.io'

export function getArcExplorerApiUrl() {
  const configured = String(process.env.ARC_EXPLORER_API_URL ?? '').trim()
  return (configured || DEFAULT_EXPLORER_API_URL).replace(/\/+$/, '')
}

function sameAddress(left, right) {
  return String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase()
}

// Converts explorer token-transfer items into Quid activity records. Only
// incoming, non-zero transfers of the given USDC token to the wallet are kept.
export function parseIncomingUsdcTransfers(items, { walletAddress, usdcAddress }) {
  const records = []

  for (const item of Array.isArray(items) ? items : []) {
    const txHash = String(item?.transaction_hash ?? '').toLowerCase()
    const from = item?.from?.hash ?? null
    const to = item?.to?.hash ?? null
    const rawValue = item?.total?.value

    if (!txHash.startsWith('0x') || !sameAddress(to, walletAddress) || sameAddress(from, walletAddress)) continue
    if (!sameAddress(item?.token?.address_hash, usdcAddress)) continue
    if (rawValue === undefined || rawValue === null || !/^\d+$/.test(String(rawValue))) continue

    const value = BigInt(rawValue)
    if (value <= 0n) continue

    const decimals = Number(item?.total?.decimals ?? item?.token?.decimals ?? 6)
    const happenedAt = Date.parse(item?.timestamp ?? '')

    records.push({
      txHash,
      fromAddress: from,
      toAddress: to,
      amount: formatUnits(value, Number.isFinite(decimals) ? decimals : 6),
      blockNumber: item?.block_number === undefined ? null : String(item.block_number),
      happenedAt: Number.isFinite(happenedAt) ? new Date(happenedAt).toISOString() : new Date().toISOString()
    })
  }

  return records
}

async function fetchJson(url, { timeoutMs, fetchImpl }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'quid-activity-indexer' },
      signal: controller.signal,
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Arc explorer request failed with status ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Returns incoming USDC transfers for a wallet, newest first.
 * - sinceMs: read back to this time (ms since epoch) and stop. Everything received
 *   after it is returned, however long ago that was. Without it, only the newest
 *   page is read.
 * - maxPages: safety cap on pages read (about 50 transfers each).
 */
export async function fetchIncomingUsdcTransfers({
  walletAddress,
  usdcAddress,
  sinceMs = null,
  maxPages = 20,
  timeoutMs = 8000,
  fetchImpl = fetch
}) {
  const base = getArcExplorerApiUrl()
  const seen = new Set()
  const records = []
  let nextParams = null
  let pagesRead = 0

  while (pagesRead < maxPages) {
    const params = new URLSearchParams({ type: 'ERC-20', filter: 'to', token: usdcAddress })

    for (const [key, value] of Object.entries(nextParams ?? {})) {
      if (value !== null && value !== undefined) params.set(key, String(value))
    }

    const payload = await fetchJson(`${base}/api/v2/addresses/${walletAddress}/token-transfers?${params}`, { timeoutMs, fetchImpl })
    const pageRecords = parseIncomingUsdcTransfers(payload?.items, { walletAddress, usdcAddress })
    let reachedCursor = false

    for (const record of pageRecords) {
      if (sinceMs !== null && Date.parse(record.happenedAt) < sinceMs) {
        reachedCursor = true
        continue
      }

      if (seen.has(record.txHash)) continue
      seen.add(record.txHash)
      records.push(record)
    }

    pagesRead += 1
    nextParams = payload?.next_page_params ?? null

    if (!nextParams || sinceMs === null || reachedCursor || !(payload?.items?.length >= 1)) break
  }

  return { records, pagesRead, reachedEnd: !nextParams }
}
