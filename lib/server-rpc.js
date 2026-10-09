import { ARC_TESTNET_ID, arcTestnet } from '@/lib/arc'
import { chains } from '@/lib/chains'

function configuredRpcUrl(value) {
  const rpcUrl = String(value ?? '').trim()
  return rpcUrl || null
}

// Keep paid/provider-backed RPC URLs on the server. Browser wallet flows retain
// their separately configurable public endpoint in NEXT_PUBLIC_ARC_RPC_URL.
export function getServerRpcUrl(chainId) {
  if (Number(chainId) === ARC_TESTNET_ID) {
    return (
      configuredRpcUrl(process.env.ARC_RPC_URL) ??
      configuredRpcUrl(process.env.NEXT_PUBLIC_ARC_RPC_URL) ??
      arcTestnet.rpcUrls.default.http[0]
    )
  }

  const chain = chains.find((item) => item.id === Number(chainId))
  return chain?.rpcUrls?.default?.http?.[0] ?? null
}
