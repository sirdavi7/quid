import {
  arbitrumSepolia,
  avalancheFuji,
  baseSepolia,
  hyperliquidEvmTestnet,
  optimismSepolia,
  polygonAmoy,
  seiTestnet,
  sepolia,
  sonicTestnet,
  unichainSepolia,
  worldchainSepolia
} from 'wagmi/chains'
import { arcTestnet } from './arc'

function withRpcUrl(chain, rpcUrl) {
  if (!rpcUrl) {
    return chain
  }

  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [rpcUrl]
      },
      public: {
        ...chain.rpcUrls.public,
        http: [rpcUrl]
      }
    }
  }
}

const arcTestnetWithRpc = withRpcUrl(arcTestnet, process.env.NEXT_PUBLIC_ARC_RPC_URL)
const avalancheFujiWithRpc = withRpcUrl(avalancheFuji, process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL)
const baseSepoliaWithRpc = withRpcUrl(baseSepolia, process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL)
const sepoliaWithRpc = withRpcUrl(
  sepolia,
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'
)
const arbitrumSepoliaWithRpc = withRpcUrl(arbitrumSepolia, process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL)
const optimismSepoliaWithRpc = withRpcUrl(optimismSepolia, process.env.NEXT_PUBLIC_OP_SEPOLIA_RPC_URL)
const polygonAmoyWithRpc = withRpcUrl(polygonAmoy, process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL)
const unichainSepoliaWithRpc = withRpcUrl(unichainSepolia, process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC_URL)
const hyperliquidEvmTestnetWithRpc = withRpcUrl(hyperliquidEvmTestnet, process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_RPC_URL)
const seiTestnetWithRpc = withRpcUrl(seiTestnet, process.env.NEXT_PUBLIC_SEI_TESTNET_RPC_URL)
const sonicTestnetWithRpc = withRpcUrl(sonicTestnet, process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC_URL)
const worldchainSepoliaWithRpc = withRpcUrl(worldchainSepolia, process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC_URL)

export const chains = [
  arcTestnetWithRpc,
  avalancheFujiWithRpc,
  baseSepoliaWithRpc,
  sepoliaWithRpc,
  arbitrumSepoliaWithRpc,
  optimismSepoliaWithRpc,
  polygonAmoyWithRpc,
  unichainSepoliaWithRpc,
  hyperliquidEvmTestnetWithRpc,
  seiTestnetWithRpc,
  sonicTestnetWithRpc,
  worldchainSepoliaWithRpc
]

// Gateway supports all twelve EVM testnets below. Circle Wallets provides
// managed contract-execution support for the first eight; the remaining four
// currently require generic EVM signing and application-side broadcasting.
export const gatewayChainOptions = [
  {
    id: arcTestnet.id,
    label: 'Arc Testnet',
    gatewayName: 'Arc_Testnet',
    circleBlockchain: 'ARC-TESTNET',
    nativeSymbol: 'USDC',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: avalancheFuji.id,
    label: 'Avalanche Fuji',
    gatewayName: 'Avalanche_Fuji',
    circleBlockchain: 'AVAX-FUJI',
    nativeSymbol: 'AVAX',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: baseSepolia.id,
    label: 'Base Sepolia',
    gatewayName: 'Base_Sepolia',
    circleBlockchain: 'BASE-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: sepolia.id,
    label: 'Ethereum Sepolia',
    gatewayName: 'Ethereum_Sepolia',
    circleBlockchain: 'ETH-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: arbitrumSepolia.id,
    label: 'Arbitrum Sepolia',
    gatewayName: 'Arbitrum_Sepolia',
    circleBlockchain: 'ARB-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: optimismSepolia.id,
    label: 'OP Sepolia',
    gatewayName: 'Optimism_Sepolia',
    circleBlockchain: 'OP-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: polygonAmoy.id,
    label: 'Polygon Amoy',
    gatewayName: 'Polygon_Amoy_Testnet',
    circleBlockchain: 'MATIC-AMOY',
    nativeSymbol: 'POL',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: unichainSepolia.id,
    label: 'Unichain Sepolia',
    gatewayName: 'Unichain_Sepolia',
    circleBlockchain: 'UNI-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    receiveWalletSupported: true,
    gatewayDepositSupported: true
  },
  {
    id: hyperliquidEvmTestnet.id,
    label: 'HyperEVM Testnet',
    gatewayName: 'HyperEVM_Testnet',
    circleBlockchain: 'EVM-TESTNET',
    nativeSymbol: 'HYPE',
    usdcAddress: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    receiveWalletSupported: false,
    gatewayDepositSupported: false,
    walletCapability: 'signing-only'
  },
  {
    id: seiTestnet.id,
    label: 'Sei Testnet',
    gatewayName: 'Sei_Testnet',
    circleBlockchain: 'EVM-TESTNET',
    nativeSymbol: 'SEI',
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    receiveWalletSupported: false,
    gatewayDepositSupported: false,
    walletCapability: 'signing-only'
  },
  {
    id: sonicTestnet.id,
    label: 'Sonic Testnet',
    gatewayName: 'Sonic_Testnet',
    circleBlockchain: 'EVM-TESTNET',
    nativeSymbol: 'S',
    usdcAddress: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    receiveWalletSupported: false,
    gatewayDepositSupported: false,
    walletCapability: 'signing-only'
  },
  {
    id: worldchainSepolia.id,
    label: 'World Chain Sepolia',
    gatewayName: 'World_Chain_Sepolia',
    circleBlockchain: 'EVM-TESTNET',
    nativeSymbol: 'ETH',
    usdcAddress: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    receiveWalletSupported: false,
    gatewayDepositSupported: false,
    walletCapability: 'signing-only'
  }
]

export const chainOptions = gatewayChainOptions.filter((option) => option.receiveWalletSupported)
