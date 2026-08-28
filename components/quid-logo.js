import Image from 'next/image'

export function QuidLogo({ full = false, className = '', priority = false }) {
  const width = full ? 180 : 42
  const height = full ? 54 : 42

  if (full) {
    return (
      <span className={`quid-logo-mark relative inline-flex ${className}`}>
        <Image
          src="/brand/quid-nobackground.png"
          alt="Quid"
          width={width}
          height={height}
          priority={priority}
          className="dark:hidden"
        />
        <Image
          src="/brand/quid-nobackgroundglow.png"
          alt="Quid"
          width={width}
          height={height}
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
      width={width}
      height={height}
      priority={priority}
      className={`quid-logo-mark ${className}`}
    />
  )
}
