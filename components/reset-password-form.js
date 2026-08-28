'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let isMounted = true
    const supabase = createSupabaseBrowserClient()

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setHasSession(Boolean(data.session))
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      setStatus('Password updated. Taking you to your dashboard...')
      window.setTimeout(() => router.replace('/dashboard'), 900)
    } catch (requestError) {
      setError(requestError.message || 'Could not update password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quid-card p-5">
      {!hasSession ? (
        <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          Open this page from the password reset email so Quid can verify the request.
        </p>
      ) : null}

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">New password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-md border border-ink/15 px-3 pr-12 outline-none focus:border-arc"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="no-motion-button absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md border border-transparent text-arc"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Confirm password</span>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-12 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="Repeat new password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      </div>

      {status ? <p className="mt-4 rounded-md bg-mint/20 px-3 py-2 text-sm font-semibold text-ink">{status}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting || !hasSession}
        className="quid-primary-action mt-5 h-12 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
        Update password
      </button>
    </form>
  )
}
