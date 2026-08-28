import {
  generateEntitySecret,
  registerEntitySecretCiphertext,
  initiateDeveloperControlledWalletsClient
} from '@circle-fin/developer-controlled-wallets'

const apiKey = process.env.CIRCLE_API_KEY

if (!apiKey) {
  throw new Error('Set CIRCLE_API_KEY first.')
}

const entitySecret = generateEntitySecret()

console.log('\nSAVE THIS AS CIRCLE_ENTITY_SECRET:')
console.log(entitySecret)

const registration = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: './circle-recovery'
})

console.log('\nEntity secret registered.')
console.log('Recovery file:', registration.data?.recoveryFile)

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret
})

const walletSetResponse = await client.createWalletSet({
  name: 'Quid Wallet Set'
})

console.log('\nSAVE THIS AS CIRCLE_WALLET_SET_ID:')
console.log(walletSetResponse.data?.walletSet?.id)