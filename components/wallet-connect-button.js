'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ChevronDown, WalletCards } from 'lucide-react'

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export default function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted
        const connected = ready && account && chain

        if (!ready) {
          return (
            <button type="button" className="quid-primary-action opacity-70" disabled>
              <WalletCards size={16} /> Connect Wallet
            </button>
          )
        }

        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className="quid-primary-action px-4">
              <WalletCards size={16} /> Connect Wallet
            </button>
          )
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openChainModal} className="quid-secondary-action px-3">
              {chain.hasIcon && chain.iconUrl ? (
                <img src={chain.iconUrl} alt="" className="h-4 w-4 rounded-full" />
              ) : null}
              {chain.name}
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={openAccountModal} className="quid-secondary-action px-3">
              <WalletCards size={15} /> {account.displayName || shortAddress(account.address)}
              <ChevronDown size={14} />
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}