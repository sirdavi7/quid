import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'node_modules', 'cuer', '_dist', 'QrCode.js')

if (!fs.existsSync(file)) {
  console.warn('[patch-cuer] cuer QR file not found; skipping.')
  process.exit(0)
}

const source = fs.readFileSync(file, 'utf8')
const patched = source.replaceAll('border: 0,', 'border: 1,').replaceAll('border:0,', 'border:1,')

if (source === patched) {
  console.log('[patch-cuer] QR border patch already applied or source changed.')
  process.exit(0)
}

fs.writeFileSync(file, patched)
console.log('[patch-cuer] Patched cuer QR border from 0 to 1.')
