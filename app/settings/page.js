import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { PageHeading } from '@/components/page-heading'
import { AppFooterStrip } from '@/components/app-footer-strip'
import { EditPageForm } from '@/components/edit-page-form'
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
    <>
      <main className="min-h-screen bg-paper">
        <AppHeader account={{ email: user.email, username: page.username }} />

        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-10 pt-6 sm:pt-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <PageHeading
            eyebrow="Settings"
            title="Edit payment page"
            description="Update the public words people see before paying your Quid link."
          />
          <div className="mt-6 rounded-lg border border-arc/20 bg-haze p-4">
            <p className="text-xs font-bold uppercase text-arc">Current public page</p>
            <p className="mt-2 text-2xl font-black text-ink">{page.name}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">/pay/{page.username}</p>
          </div>
        </div>

        <EditPageForm page={page} />
        </section>
      </main>
      <AppFooterStrip />
    </>
  )
}
