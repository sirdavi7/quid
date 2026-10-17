import { defineChain } from 'viem'

export const ARC_TESTNET_ID = 5042002
export const ARC_TESTNET_CHAIN = 'Arc_Testnet'
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
export const ARC_EXPLORER_URL = 'https://testnet.arcscan.app'
const LEGACY_ARC_TESTNET_RPC_URL = 'https://rpc.testnet.arc.network'
const CIRCLE_ARC_TESTNET_RPC_URL = 'https://rpc.testnet.arc.io'

export const ARC_TESTNET_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL === LEGACY_ARC_TESTNET_RPC_URL
  ? CIRCLE_ARC_TESTNET_RPC_URL
  : process.env.NEXT_PUBLIC_ARC_RPC_URL ?? CIRCLE_ARC_TESTNET_RPC_URL

export const arcTestnet = defineChain({
  id: ARC_TESTNET_ID,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USD Coin',
    symbol: 'USDC'
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC_URL]
    },
    public: {
      http: [CIRCLE_ARC_TESTNET_RPC_URL]
    }
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: ARC_EXPLORER_URL
    }
  },
  testnet: true
})

export const usdcAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
]
