import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

const apiKey = process.env.CIRCLE_API_KEY
const entitySecret = process.env.CIRCLE_ENTITY_SECRET

if (!apiKey) {
  throw new Error('Missing CIRCLE_API_KEY')
}

if (!entitySecret || entitySecret === 'undefined') {
  throw new Error('Missing real CIRCLE_ENTITY_SECRET')
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret
})

const response = await client.createWalletSet({
  name: 'Quid Wallet Set'
})

console.log('SAVE THIS AS CIRCLE_WALLET_SET_ID:')
console.log(response.data?.walletSet?.id)