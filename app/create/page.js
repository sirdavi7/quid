import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { redirect } from 'next/navigation'
import { CreatePageForm } from '@/components/create-page-form'
import { DashboardNavButton, FaucetNavButton, HomeNavButton } from '@/components/nav-buttons'
import { getPageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Create Page'
}

export default async function CreatePage() {
  let user = null

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) {
    redirect('/login?next=/create')
  }

  const existingPage = await getPageForOwner(user.id)

  if (existingPage) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader>
        <HomeNavButton />
        <DashboardNavButton />
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Create</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink md:text-5xl">
            Generate a pay-me link backed by an Arc Testnet wallet.
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink/65">
            Quid creates a Circle developer-controlled wallet when your Circle credentials are configured. In local demo mode it creates a mock address so the interface stays usable.
          </p>
        </div>
        <CreatePageForm />
      </section>
      <AppFooter />
    </main>
  )
}
