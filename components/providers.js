'use client'

import dynamic from 'next/dynamic'

const Web3Providers = dynamic(() => import('./web3-providers'), {
  ssr: false,
  loading: () => null
})

export function Providers({ children }) {
  return <Web3Providers>{children}</Web3Providers>
}
