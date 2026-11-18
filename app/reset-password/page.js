import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'
import { AppFooterStrip } from '@/components/app-footer-strip'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Reset Password'
}

export default async function ResetPasswordPage() {
  let hasSession = false

  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    hasSession = Boolean(user)
  } catch {
    hasSession = false
  }

  return (
    <>
      <main className="min-h-screen bg-paper">
        <AppHeader />

        <section className="mx-auto grid max-w-5xl gap-8 px-5 pb-10 pt-6 sm:pt-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <PageHeading
            size="hero"
            eyebrow="Reset password"
            title="Set a new password."
            description="Use the password reset link from your email, then choose a new password for your Quid workspace."
          />
        </div>
        <ResetPasswordForm initialHasSession={hasSession} />
        </section>
      </main>
      <AppFooterStrip />
    </>
  )
}
