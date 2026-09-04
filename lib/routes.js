export function getSafeNextPath(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return fallback
  }

  return value
}
