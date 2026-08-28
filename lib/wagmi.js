import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { defineChain, http } from 'viem'
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

export const config = createConfig({
  chains,
  connectors,
  transports: Object.fromEntries(
    chains.map((chain) => [
      chain.id,
      http(chain.id === arcTestnet.id ? process.env.NEXT_PUBLIC_ARC_RPC_URL : undefined)
    ])
  ),
  ssr: true
})
