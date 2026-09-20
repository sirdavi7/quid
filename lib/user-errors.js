function errorText(error) {
  if (typeof error === 'string') return error

  const responseData = error?.response?.data
  const values = [
    error?.message,
    responseData?.message,
    responseData?.error,
    responseData?.code,
    error?.code
  ]

  return values.filter(Boolean).join(' ').toLowerCase()
}

export function getFriendlyUserError(error, options = {}) {
  const text = errorText(error)
  const chainLabel = options.chainLabel ?? 'the selected chain'
  const nativeSymbol = options.nativeSymbol ?? 'native test tokens'

  if (text.includes('mainnet actions are not available')) {
    return 'Mainnet actions are not available in Quid yet. This workspace is still running on Arc Testnet.'
  }

  if (text.includes('network configuration is not valid')) {
    return 'Quid cannot move funds right now. Please try again later.'
  }

  if (text.includes('valid recipient address')) {
    return text.includes('gateway')
      ? 'Enter a valid recipient address before withdrawing Gateway USDC.'
      : 'Enter a valid recipient address before withdrawing USDC.'
  }

  if (text.includes('valid usdc amount') && text.includes('withdrawing gateway')) {
    return 'Enter a valid USDC amount before withdrawing Gateway USDC.'
  }

  if (text.includes('valid usdc amount') && text.includes('withdrawing')) {
    return 'Enter a valid USDC amount before withdrawing.'
  }

  if (text.includes('valid usdc amount') && text.includes('depositing to gateway')) {
    return 'Enter a valid USDC amount before depositing to Gateway.'
  }

  if (text.includes('insufficient') && (text.includes('gas') || text.includes('fee') || text.includes('native'))) {
    if (options.operation === 'gateway-deposit') {
      const feeAsset = chainLabel === 'Ethereum Sepolia' ? 'Sepolia ETH' : nativeSymbol
      return `Your ${chainLabel} receive wallet needs ${feeAsset} to pay the Gateway deposit fee. Add test ${nativeSymbol}, then try again.`
    }

    return `Your ${chainLabel} receive wallet needs ${nativeSymbol} to pay the transaction fee. Add test ${nativeSymbol}, then try again.`
  }

  if (options.operation === 'gateway-deposit') {
    return `Gateway deposit could not be submitted on ${chainLabel}. Make sure the receive wallet has enough USDC and test ${nativeSymbol} to pay the Gateway deposit fee, then try again.`
  }

  if (text.includes('insufficient') || text.includes('exceeds balance')) {
    return 'This wallet does not have enough USDC to complete that action.'
  }

  if (text.includes('unauthorized') || text.includes('not authenticated') || text.includes('session')) {
    return 'Your session has ended. Sign in again, then try once more.'
  }

  if (text.includes('fetch failed') || text.includes('failed to fetch') || text.includes('network') || text.includes('timeout') || text.includes('rate limit') || text.includes('rpc')) {
    return 'Quid could not reach the selected network right now. Wait a moment, then try again.'
  }

  return options.fallback ?? 'Something went wrong. Please try again.'
}

export function getSafeApiError(error, options = {}) {
  return getFriendlyUserError(error, options)
}

export function logServerError(context, error) {
  console.error(`[Quid] ${context}`, {
    message: error?.message ?? String(error ?? 'Unknown error'),
    status: error?.response?.status,
    code: error?.code ?? error?.response?.data?.code
  })
}
