import Image from 'next/image'

export function UsdcMark({ className = 'h-4 w-4' }) {
  return (
    <Image
      src="/brand/usdc-q.png"
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      className={`${className} shrink-0 object-contain`}
    />
  )
}

export function UsdcAmountInput({ className = '', ...inputProps }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
        <UsdcMark className="h-5 w-5" />
      </span>
      <input {...inputProps} className={`${className} !pl-10 !pr-16`} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-ink/50">
        USDC
      </span>
    </div>
  )
}
