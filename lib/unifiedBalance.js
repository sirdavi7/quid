import { createCircleWalletsAdapter } from '@circle-fin/adapter-circle-wallets'
import { UnifiedBalanceKit } from '@circle-fin/unified-balance-kit'

export function createServerUnifiedBalanceKit() {
  return new UnifiedBalanceKit()
}

export function createCircleWalletsUnifiedAdapter() {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    throw new Error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required.')
  }

  return createCircleWalletsAdapter({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  })
}
