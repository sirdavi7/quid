'use client'

import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'

function isWalletConnectDisconnectNoise(error) {
  const message = String(error?.message ?? error ?? '')
  const stack = String(error?.stack ?? '')

  return message.includes('provider.disconnect is not a function') && stack.includes('@walletconnect')
}

export default function Web3Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    function handleUnhandledRejection(event) {
      if (isWalletConnectDisconnectNoise(event.reason)) {
        event.preventDefault()
      }
    }

    function handleError(event) {
      if (isWalletConnectDisconnectNoise(event.error)) {
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#6d35f2',
            borderRadius: 'small',
            fontStack: 'system'
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
