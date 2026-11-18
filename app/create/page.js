import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'
import { AppFooter } from '@/components/app-footer'
import { redirect } from 'next/navigation'
import { CreatePageForm } from '@/components/create-page-form'
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
      <AppHeader account={{ email: user.email }} />

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-10 pt-6 sm:pt-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <PageHeading
            size="hero"
            eyebrow="Create"
            title="Generate a pay-me link backed by an Arc Testnet wallet."
            description="Quid creates a Circle developer-controlled wallet when your Circle credentials are configured. In local demo mode it creates a mock address so the interface stays usable."
          />
        </div>
        <CreatePageForm />
      </section>
      <AppFooter />
    </main>
  )
}
