'use client'

import { formatQuidTimestamp } from '@/lib/date-time'

export function LocalTimestamp({ value, emptyLabel = 'Not available', className }) {
  const label = typeof window === 'undefined' ? '—' : formatQuidTimestamp(value, emptyLabel)

  return (
    <time dateTime={value || undefined} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
