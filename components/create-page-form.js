'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

export function CreatePageForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    username: '',
    headline: '',
    note: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not create this page.')
      }
 
      router.push('/dashboard')
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
            placeholder="David Obi"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Quid username</span>
          <div className="flex h-12 overflow-hidden rounded-md border border-ink/15 focus-within:border-arc">
            <span className="flex items-center bg-ink/5 px-3 text-sm font-semibold text-ink/50">
              /pay/
            </span>
            <input
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
              className="min-w-0 flex-1 px-3 outline-none"
              placeholder="dave"
              required
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Payment headline</span>
          <input
            value={form.headline}
            onChange={(event) => updateField('headline', event.target.value)}
            className="h-12 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="Test USDC payments"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Optional note</span>
          <textarea
            value={form.note}
            onChange={(event) => updateField('note', event.target.value)}
            className="min-h-28 rounded-md border border-ink/15 p-3 outline-none focus:border-arc"
            placeholder="Thanks for paying with USDC."
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="quid-primary-action mt-5 h-12 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        Create Quid page
      </button>
    </form>
  )
}
