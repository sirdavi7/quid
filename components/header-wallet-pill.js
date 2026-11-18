'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AlertTriangle, ChevronDown, WalletCards } from 'lucide-react'

const pillBase =
  'inline-flex h-10 items-center gap-2 rounded-xl border text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arc/40'

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function HeaderWalletPill({ fullWidth = false }) {
  const width = fullWidth ? 'w-full justify-center' : ''

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        if (!mounted) {
          return (
            <button type="button" disabled className={`${pillBase} ${width} border-arc/20 px-3 text-arc opacity-60`}>
              <WalletCards size={16} /> Wallet
            </button>
          )
        }

        if (!account || !chain) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={`${pillBase} ${width} border-arc/25 bg-paper/60 px-3 text-arc hover:border-arc/50 hover:bg-arc/10`}
            >
              <WalletCards size={16} /> Connect wallet
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              role="status"
              className={`${pillBase} ${width} border-coral/50 bg-coral/10 px-3 text-coral hover:bg-coral/15`}
            >
              <AlertTriangle size={16} /> Wrong network <ChevronDown size={14} />
            </button>
          )
        }

        return (
          <div className={`${pillBase} ${width} overflow-hidden border-arc/25 bg-paper/60 p-0`}>
            <button
              type="button"
              onClick={openChainModal}
              title={`Network: ${chain.name}. Switch network`}
              aria-label={`Network: ${chain.name}. Switch network`}
              className="inline-flex h-full items-center gap-1.5 border-r border-arc/15 px-2.5 text-ink/70 transition hover:bg-arc/10 hover:text-arc"
            >
              {chain.hasIcon && chain.iconUrl ? (
                <img src={chain.iconUrl} alt="" className="h-4 w-4 rounded-full" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-mint" />
              )}
              <ChevronDown size={12} />
            </button>
            <button
              type="button"
              onClick={openAccountModal}
              title="Wallet account"
              className="inline-flex h-full flex-1 items-center justify-center gap-2 px-3 text-ink transition hover:bg-arc/10 hover:text-arc"
            >
              <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
              {shortAddress(account.address)}
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
