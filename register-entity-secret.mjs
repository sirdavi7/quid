import fs from 'fs'
import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'

const apiKey = process.env.CIRCLE_API_KEY
const entitySecret = process.env.CIRCLE_ENTITY_SECRET

if (!apiKey) {
  throw new Error('Missing CIRCLE_API_KEY')
}

if (!entitySecret || entitySecret === 'undefined') {
  throw new Error('Missing real CIRCLE_ENTITY_SECRET')
}

const response = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret
})

fs.writeFileSync(
  'circle-recovery-file.dat',
  response.data?.recoveryFile ?? ''
)

console.log('Entity secret registered.')
console.log('Recovery file saved as circle-recovery-file.dat')