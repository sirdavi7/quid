'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, X } from 'lucide-react'

export function SignOutConfirmButton({ className }) {
  const [isOpen, setIsOpen] = useState(false)
  const modal = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[80] grid place-items-center bg-night/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-arc/20 bg-paper p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-arc">Account session</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Sign out of Quid?</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Your page and payment records stay saved. You will need to sign in again before managing your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arc/20 bg-white text-ink"
                aria-label="Close sign out dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="quid-secondary-action h-11 px-4"
              >
                Stay signed in
              </button>
              <form action="/auth/sign-out" method="post" className="contents">
                <button className="quid-primary-action h-11 px-4">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        <LogOut size={14} /> Sign out
      </button>
      {modal}
    </>
  )
}
