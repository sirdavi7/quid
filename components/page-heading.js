// Shared intro block for app pages: eyebrow chip, title, description, optional action.
export function PageHeading({ eyebrow, title, description, action, size = 'compact' }) {
  const titleClass = size === 'hero' ? 'text-4xl md:text-5xl' : 'text-4xl'
  const descriptionClass = size === 'hero' ? 'text-lg leading-8 text-ink/65' : 'text-base leading-7 text-ink/60'

  const content = (
    <div>
      {eyebrow ? (
        <p className="inline-flex items-center rounded-full border border-arc/20 bg-arc/10 px-3 py-1 text-xs font-black uppercase text-arc">
          {eyebrow}
        </p>
      ) : null}
      <h1 className={`mt-4 font-black leading-tight text-ink ${titleClass}`}>{title}</h1>
      {description ? <p className={`mt-3 max-w-xl ${descriptionClass}`}>{description}</p> : null}
    </div>
  )

  if (!action) return content

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      {content}
      {action}
    </div>
  )
}
