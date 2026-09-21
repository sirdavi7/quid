export function formatQuidTimestamp(value, emptyLabel = 'Not available') {
  if (!value) {
    return emptyLabel
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return emptyLabel
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
