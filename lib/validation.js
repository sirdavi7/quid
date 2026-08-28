import { isAddress } from 'viem'

export function normalizeUsername(username) {
  return String(username ?? '').trim().toLowerCase()
}

export function validateUsername(username) {
  return /^[a-z0-9_-]{3,24}$/.test(username)
}

export function validateAmount(amount) {
  const value = Number(amount)
  return Number.isFinite(value) && value > 0 && value <= 100
}

export function validateAddress(address) {
  return isAddress(String(address ?? ''))
}
