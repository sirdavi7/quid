export function getFriendlyAuthError(message) {
  const text = String(message ?? '').toLowerCase()

  if (text.includes('invalid login credentials')) {
    return 'The email or password is incorrect. Check both fields, or reset your password.'
  }

  if (
    text.includes('fetch failed') ||
    text.includes('failed to fetch') ||
    text.includes('network') ||
    text.includes('load failed')
  ) {
    return 'You appear to be offline, or Quid cannot reach auth right now. Connect to the internet and try again.'
  }

  if (text.includes('email not confirmed')) {
    return 'Confirm your email first, then sign in again.'
  }

  return message || 'Authentication failed. Please try again.'
}
