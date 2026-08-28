import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia
} from 'wagmi/chains'
import { arcTestnet } from './arc'

export const chains = [
  arcTestnet,
  baseSepolia,
  sepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy
]

export const chainOptions = [
  {
    id: arcTestnet.id,
    label: 'Arc Testnet',
    gatewayName: 'Arc_Testnet',
    circleBlockchain: 'ARC-TESTNET',
    nativeSymbol: 'USDC',
    usdcAddress: '0x3600000000000000000000000000000000000000'
  },
  {
    id: baseSepolia.id,
    label: 'Base Sepolia',
    gatewayName: 'Base_Sepolia',
    circleBlockchain: 'BASE-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  },
  {
    id: sepolia.id,
    label: 'Ethereum Sepolia',
    gatewayName: 'Ethereum_Sepolia',
    circleBlockchain: 'ETH-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  {
    id: arbitrumSepolia.id,
    label: 'Arbitrum Sepolia',
    gatewayName: 'Arbitrum_Sepolia',
    circleBlockchain: 'ARB-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
  },
  {
    id: optimismSepolia.id,
    label: 'OP Sepolia',
    gatewayName: 'Optimism_Sepolia',
    circleBlockchain: 'OP-SEPOLIA',
    nativeSymbol: 'ETH',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
  },
  {
    id: polygonAmoy.id,
    label: 'Polygon Amoy',
    gatewayName: 'Polygon_Amoy_Testnet',
    circleBlockchain: 'MATIC-AMOY',
    nativeSymbol: 'POL',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
  }
]
