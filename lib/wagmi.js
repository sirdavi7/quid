import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { defineChain, fallback, http } from 'viem'
import { createConfig } from 'wagmi'
import { arcTestnet } from './arc'
import { chains } from './chains'

export const ar = arcTestnet
export { defineChain }
export { chainOptions, chains } from './chains'

export const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''
export const hasValidWalletConnectProjectId = /^[a-f0-9]{32}$/i.test(walletConnectProjectId)
export const walletConnectQrEnabled = hasValidWalletConnectProjectId

const walletGroups = [
  {
    groupName: 'Recommended',
    wallets: [
      injectedWallet,
      ...(hasValidWalletConnectProjectId ? [(options) => walletConnectWallet(options)] : [])
    ]
  }
]

const connectors = connectorsForWallets(walletGroups, {
  appName: 'Quid',
  projectId: walletConnectProjectId || '00000000000000000000000000000000'
})

function transportForChain(chain) {
  if (chain.id !== arcTestnet.id) {
    return http()
  }

  const configuredArcRpc = process.env.NEXT_PUBLIC_ARC_RPC_URL
  const publicArcRpc = 'https://rpc.testnet.arc.network'
  const transports = [
    ...(configuredArcRpc && configuredArcRpc !== publicArcRpc ? [http(configuredArcRpc)] : []),
    http(publicArcRpc)
  ]

  return transports.length === 1 ? transports[0] : fallback(transports)
}

export const config = createConfig({
  chains,
  connectors,
  transports: Object.fromEntries(
    chains.map((chain) => [
      chain.id,
      transportForChain(chain)
    ])
  ),
  ssr: true
})
