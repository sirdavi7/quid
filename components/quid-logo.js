import Image from 'next/image'

const fullSizes = {
  default: { width: 180, height: 54 },
  header: { width: 132, height: 40 },
  footer: { width: 148, height: 44 }
}

export function QuidLogo({ full = false, size = 'default', className = '', priority = false }) {
  const dimensions = full ? fullSizes[size] ?? fullSizes.default : { width: 42, height: 42 }

  if (full) {
    return (
      <span className={`quid-logo-mark relative inline-flex ${className}`}>
        <Image
          src="/brand/quid-nobackground.png"
          alt="Quid"
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className="dark:hidden"
        />
        <Image
          src="/brand/quid-nobackgroundglow.png"
          alt="Quid"
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className="hidden dark:block"
        />
      </span>
    )
  }

  return (
    <Image
      src="/brand/quid-q.png"
      alt="Quid"
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={`quid-logo-mark ${className}`}
    />
  )
}
