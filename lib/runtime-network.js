const DEFAULT_NETWORK = 'testnet'

function configuredNetwork() {
  return String(process.env.QUID_NETWORK ?? DEFAULT_NETWORK).trim().toLowerCase()
}

// Quid's on-chain routes are currently configured only for Arc Testnet.
// Block other modes explicitly so a deployment setting cannot turn testnet
// wallet or Gateway configuration into an accidental production action.
export function getOnchainActionBlockMessage() {
  const network = configuredNetwork()

  if (network === 'testnet') {
    return null
  }

  if (network === 'mainnet') {
    return 'Mainnet actions are not available in Quid yet. This workspace is still running on Arc Testnet.'
  }

  return 'Quid cannot move funds because its network configuration is not valid. Please try again later.'
}
