import { UsdcMark } from '@/components/usdc-mark'

function feeItemsForDisplay(quote) {
  const structuredItems = Array.isArray(quote?.feeItems)
    ? quote.feeItems.filter((item) => item?.label && item?.amount !== undefined && item?.asset)
    : []

  if (structuredItems.length) {
    return structuredItems
  }

  return Array.isArray(quote?.feeLines)
    ? quote.feeLines.filter(Boolean).map((line, index) => ({ id: `fee-line-${index}`, text: String(line) }))
    : []
}

function FeeValue({ amount, asset }) {
  const isUsdc = String(asset ?? '').toUpperCase() === 'USDC'

  return (
    <span className="flex shrink-0 items-center gap-1.5 text-right font-black text-ink">
      {isUsdc ? <UsdcMark className="h-4 w-4" /> : null}
      {amount} {asset}
    </span>
  )
}

function feeContext(quote) {
  if (quote?.feeMode === 'gateway') {
    return `Gateway route fee quote in ${quote.feeAsset ?? 'USDC'}`
  }

  return `Estimated native gas in ${quote?.gasAsset ?? 'USDC'}`
}

export function NetworkFeeSummary({ quote, amount, amountLabel, className = '' }) {
  const feeItems = feeItemsForDisplay(quote)

  return (
    <div className={`rounded-md border border-arc/20 bg-haze p-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase text-arc">Network and fee</p>
        <p className="text-xs font-bold text-ink/55">
          {quote.network}
        </p>
      </div>

      <p className="mt-2 text-xs font-black uppercase text-ink/55">{feeContext(quote)}</p>
      <div className="mt-3 grid gap-0">
        {feeItems.length ? feeItems.map((item, index) => {
          if (item.text) {
            return (
              <p key={item.id ?? `fee-line-${index}`} className="border-b border-ink/10 py-2 text-sm font-black text-ink last:border-b-0">
                {item.text}
              </p>
            )
          }

          return (
            <div key={`${item.label}-${item.amount}-${item.asset}-${index}`} className="flex items-center justify-between gap-3 border-b border-ink/10 py-2 last:border-b-0">
              <span className="text-sm font-semibold text-ink/65">{item.label}</span>
              <FeeValue amount={item.amount} asset={item.asset} />
            </div>
          )
        }) : (
          <p className="py-2 text-sm font-semibold text-ink/60">No additional route fee was quoted.</p>
        )}
      </div>

      {amount ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <span className="text-sm font-semibold text-ink/65">{amountLabel}</span>
          <FeeValue amount={amount} asset="USDC" />
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-ink/60">{quote.detail}</p>
    </div>
  )
}
