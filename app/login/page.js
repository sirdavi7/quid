import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'
import { AppFooter } from '@/components/app-footer'
import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeNextPath } from '@/lib/routes'

export const metadata = {
  title: 'Login'
}

export default async function LoginPage({ searchParams }) {
  const next = getSafeNextPath(searchParams?.next)
  const supabase = createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect(next)
  }

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader />

      <section className="mx-auto grid max-w-5xl gap-8 px-5 pb-10 pt-6 sm:pt-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <PageHeading
            size="hero"
            eyebrow="Login"
            title="Access your Quid workspace."
            description="Create an account or sign in to manage your payment link, creator wallet controls, and USDC payout workflow."
          />
        </div>
        <Suspense fallback={null}>
          <LoginForm nextPath={next} />
        </Suspense>
      </section>
      <AppFooter />
    </main>
  )
}
