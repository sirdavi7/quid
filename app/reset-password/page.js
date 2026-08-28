import { AppHeader } from '@/components/app-header'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { FaucetNavButton, HomeNavButton, LoginNavButton } from '@/components/nav-buttons'

export const metadata = {
  title: 'Reset Password'
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-paper">
      <AppHeader>
        <HomeNavButton />
        <LoginNavButton />
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Reset password</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink md:text-5xl">
            Set a new password.
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink/65">
            Use the password reset link from your email, then choose a new password for your Quid workspace.
          </p>
        </div>
        <ResetPasswordForm />
      </section>
    </main>
  )
}
