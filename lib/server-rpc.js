import { ARC_TESTNET_ID, arcTestnet } from '@/lib/arc'
import { chains } from '@/lib/chains'

function configuredRpcUrl(value) {
  const rpcUrl = String(value ?? '').trim()
  return rpcUrl || null
}

function configuredServerRpcUrl(chainId) {
  const urls = {
    [ARC_TESTNET_ID]: process.env.ARC_RPC_URL,
    43113: process.env.AVALANCHE_FUJI_RPC_URL,
    84532: process.env.BASE_SEPOLIA_RPC_URL,
    11155111: process.env.SEPOLIA_RPC_URL,
    421614: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    11155420: process.env.OP_SEPOLIA_RPC_URL,
    80002: process.env.POLYGON_AMOY_RPC_URL,
    1301: process.env.UNICHAIN_SEPOLIA_RPC_URL
  }

  return configuredRpcUrl(urls[Number(chainId)])
}

// Keep paid/provider-backed RPC URLs on the server. Browser wallet flows retain
// their separately configurable NEXT_PUBLIC_* endpoints.
export function getServerRpcUrl(chainId) {
  const configured = configuredServerRpcUrl(chainId)

  if (configured) {
    return configured
  }

  if (Number(chainId) === ARC_TESTNET_ID) {
    return configuredRpcUrl(process.env.NEXT_PUBLIC_ARC_RPC_URL) ?? arcTestnet.rpcUrls.default.http[0]
  }

  const chain = chains.find((item) => item.id === Number(chainId))
  return chain?.rpcUrls?.default?.http?.[0] ?? null
}
