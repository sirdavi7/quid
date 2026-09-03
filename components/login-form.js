'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, UserPlus } from 'lucide-react'
import { getFriendlyAuthError } from '@/lib/auth-errors'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

function getSafeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return '/dashboard'
  }

  return value
}

export function LoginForm({ nextPath = '/dashboard' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const next = useMemo(() => {
    return getSafeNextPath(searchParams.get('next') || nextPath)
  }, [nextPath, searchParams])

  useEffect(() => {
    let isMounted = true
    const supabase = createSupabaseBrowserClient()

    supabase.auth.getSession()
      .then(({ data }) => {
        if (isMounted && data.session) {
          router.replace(next)
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Quid could not verify your current session. You can still sign in again.')
        }
      })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        router.replace(next)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [next, router])

  function resetMessages() {
    setStatus('')
    setError('')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setConfirmationEmail('')
    setShowMagicLink(false)
    resetMessages()
  }

  function getEmailRedirectUrl(target = next) {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    resetMessages()

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to sign in to Quid.')
      return
    }

    setPendingAction(mode)

    try {
      const supabase = createSupabaseBrowserClient()
      const authResult = mode === 'create-account'
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getEmailRedirectUrl() }
          })
        : await supabase.auth.signInWithPassword({ email, password })
      const { data, error: authError } = authResult

      if (authError) {
        throw authError
      }

      if (data.session) {
        router.replace(next)
        return
      }

      if (mode === 'create-account') {
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setStatus('This email may already have a Quid account. Switch to Sign in, or reset your password if needed.')
          return
        }

        setConfirmationEmail(email)
        setStatus('Account created. Check your inbox and spam folder for the confirmation email.')
      } else {
        setStatus('Check your email to finish signing in.')
      }
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function handlePasswordReset() {
    resetMessages()

    if (!email) {
      setError('Enter your email address first, then request a reset link.')
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to request a password reset.')
      return
    }

    setPendingAction('password-reset')

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getEmailRedirectUrl('/reset-password')
      })

      if (resetError) {
        throw resetError
      }

      setStatus('If that email has a Quid account, a password reset link has been sent.')
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function handleMagicLink() {
    resetMessages()

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to request an email sign-in link.')
      return
    }

    setPendingAction('magic-link')

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getEmailRedirectUrl() }
      })

      if (signInError) {
        throw signInError
      }

      setStatus('Check your inbox and spam folder for the secure Quid sign-in link.')
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function handleResendConfirmation() {
    resetMessages()

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to resend the confirmation email.')
      return
    }

    setPendingAction('resend-confirmation')

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: confirmationEmail || email,
        options: { emailRedirectTo: getEmailRedirectUrl() }
      })

      if (resendError) {
        throw resendError
      }

      setStatus('Confirmation email sent again. Check your inbox and spam folder.')
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError.message))
    } finally {
      setPendingAction('')
    }
  }

  async function handleGoogleSignIn() {
    resetMessages()

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to continue with Google.')
      return
    }

    if (!googleAuthEnabled) {
      setError('Google sign-in is not enabled yet. Use email and password for now.')
      return
    }

    setPendingAction('google')

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getEmailRedirectUrl() }
      })

      if (oauthError) {
        throw oauthError
      }
    } catch (requestError) {
      setPendingAction('')
      setError(getFriendlyAuthError(requestError.message))
    }
  }

  const isSubmitting = Boolean(pendingAction)
  const isCreating = mode === 'create-account'
  const googleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'

  return (
    <form onSubmit={handlePasswordSubmit} className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <div className="grid grid-cols-2 rounded-md border border-arc/15 bg-haze p-1">
        <button
          type="button"
          onClick={() => switchMode('sign-in')}
          className={`h-10 rounded-md text-sm font-bold ${mode === 'sign-in' ? 'bg-arc text-white shadow-sm' : 'text-ink/55 hover:text-arc'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode('create-account')}
          className={`h-10 rounded-md text-sm font-bold ${mode === 'create-account' ? 'bg-arc text-white shadow-sm' : 'text-ink/55 hover:text-arc'}`}
        >
          Create account
        </button>
      </div>

      {googleAuthEnabled ? (
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="quid-secondary-action mt-5 h-12 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === 'google' ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          Continue with Google
        </button>
      ) : null}

      <div className={`${googleAuthEnabled ? 'my-5' : 'mb-5 mt-1'} flex items-center gap-3 text-xs font-bold uppercase text-ink/35`}>
        <span className="h-px flex-1 bg-ink/10" />
        or use email
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-md border border-ink/15 px-3 outline-none focus:border-arc"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-md border border-ink/15 px-3 pr-12 outline-none focus:border-arc"
              placeholder="At least 8 characters"
              autoComplete={isCreating ? 'new-password' : 'current-password'}
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
      </div>

      {status ? <p className="mt-4 rounded-md bg-mint/20 px-3 py-2 text-sm font-semibold text-ink">{status}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="quid-primary-action mt-5 h-12 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingAction === mode ? <Loader2 size={18} className="animate-spin" /> : isCreating ? <UserPlus size={18} /> : <KeyRound size={18} />}
        {isCreating ? 'Create Quid account' : 'Sign in to Quid'}
      </button>

      {!isCreating ? (
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={isSubmitting}
          className="mt-3 h-10 w-full rounded-md text-sm font-bold text-ink/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === 'password-reset' ? 'Sending reset link...' : 'Forgot password?'}
        </button>
      ) : null}

      {isCreating && confirmationEmail ? (
        <button
          type="button"
          onClick={handleResendConfirmation}
          disabled={isSubmitting}
          className="quid-secondary-action mt-3 h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === 'resend-confirmation' ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
          Resend confirmation email
        </button>
      ) : null}

      {showMagicLink ? (
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={isSubmitting || !email}
          className="quid-secondary-action mt-3 h-11 w-full px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === 'magic-link' ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
          Send secure email link
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowMagicLink(true)}
          className="mt-3 h-10 w-full rounded-md text-sm font-bold text-ink/60 hover:text-ink"
        >
          Use email link instead
        </button>
      )}
    </form>
  )
}
