import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { CreateNavButton, FaucetNavButton, HomeNavButton } from '@/components/nav-buttons'
import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export const metadata = {
  title: 'Login'
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper">
      <AppHeader>
        <HomeNavButton />
        <CreateNavButton label="Create" />
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Login</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink md:text-5xl">
            Access your Quid workspace.
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink/65">
            Create an account or sign in to manage your payment link, creator wallet controls, and USDC payout workflow.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
      <AppFooter />
    </main>
  )
}
