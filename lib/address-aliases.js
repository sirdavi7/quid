export function normalizeEvmAddress(value) {
  const address = String(value ?? '').trim()

  return /^0x[0-9a-fA-F]{40}$/.test(address) ? address.toLowerCase() : null
}

export function shortWalletAddress(address, fallback = 'Unknown') {
  if (!address) {
    return fallback
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function quidPageLabelForAddress(address, aliases) {
  const normalizedAddress = normalizeEvmAddress(address)
  const username = normalizedAddress ? aliases?.[normalizedAddress] : null

  return username ? `/pay/${username}` : null
}

export function addressOrQuidPageLabel(address, aliases, fallback = 'Unknown') {
  return quidPageLabelForAddress(address, aliases) ?? shortWalletAddress(address, fallback)
}
