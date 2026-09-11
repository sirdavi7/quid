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

  if (text.includes('insufficient') && (text.includes('gas') || text.includes('fee') || text.includes('native'))) {
    return `Your ${chainLabel} receive wallet needs ${nativeSymbol} to pay the transaction fee. Add test ${nativeSymbol}, then try again.`
  }

  if (options.operation === 'gateway-deposit') {
    return `We could not prepare this Gateway deposit on ${chainLabel}. Make sure the receive wallet has enough USDC and test ${nativeSymbol} for fees, then try again.`
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
