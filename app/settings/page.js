import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { EditPageForm } from '@/components/edit-page-form'
import { DashboardNavButton, FaucetNavButton, HomeNavButton, OpenPaymentPageNavButton } from '@/components/nav-buttons'
import { getPageForOwner } from '@/lib/store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Settings'
}

export default async function SettingsPage() {
  let user = null

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) {
    redirect('/login?next=/settings')
  }

  const page = await getPageForOwner(user.id)

  if (!page) {
    redirect('/create')
  }

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader>
        <HomeNavButton />
        <OpenPaymentPageNavButton username={page.username} />
        <DashboardNavButton />
        <FaucetNavButton />
      </AppHeader>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase text-arc">Settings</p>
          <h1 className="mt-2 text-4xl font-black text-ink">Edit payment page</h1>
          <p className="mt-3 text-ink/60">
            Update the public words people see before paying your Quid link.
          </p>
          <div className="mt-6 rounded-lg border border-arc/20 bg-haze p-4">
            <p className="text-xs font-bold uppercase text-arc">Current public page</p>
            <p className="mt-2 text-2xl font-black text-ink">{page.name}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">/pay/{page.username}</p>
          </div>
        </div>

        <EditPageForm page={page} />
      </section>
    </main>
  )
}
