'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

export function EditPageForm({ page }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: page.name,
    headline: page.headline,
    note: page.note ?? ''
  })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/pages/${page.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not update this page.')
      }

      setStatus('Payment page updated.')
      router.refresh()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quid-card p-5">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Display name</span>
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="h-12 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Payment headline</span>
          <input
            value={form.headline}
            onChange={(event) => updateField('headline', event.target.value)}
            className="h-12 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="USDC payments accepted here"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Payment note</span>
          <textarea
            value={form.note}
            onChange={(event) => updateField('note', event.target.value)}
            className="min-h-28 rounded-md border border-ink/15 p-3 outline-none focus:border-arc"
            placeholder="Add what people should know before paying you."
          />
        </label>

        <div className="rounded-md border border-arc/20 bg-haze p-3">
          <p className="text-xs font-bold uppercase text-arc">Public link</p>
          <p className="mt-1 font-mono text-sm text-ink">/pay/{page.username}</p>
          <p className="mt-2 text-xs leading-5 text-ink/55">Username editing is locked for now so shared links do not break.</p>
        </div>
      </div>

      {status ? <p className="mt-4 rounded-md bg-mint/20 px-3 py-2 text-sm font-semibold text-ink">{status}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="quid-primary-action mt-5 h-12 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Save payment page
      </button>
    </form>
  )
}
