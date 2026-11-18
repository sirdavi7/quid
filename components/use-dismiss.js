'use client'

import { useEffect } from 'react'

// Calls onClose on Escape or on a pointer press outside the element held by `ref`.
export function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    function handlePointer(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handlePointer)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handlePointer)
    }
  }, [open, onClose, ref])
}
