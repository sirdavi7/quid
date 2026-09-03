import { AppHeader } from '@/components/app-header'

export default function Loading() {
  return (
    <main className="min-h-screen bg-paper">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pt-14">
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase text-arc">Quid</p>
          <h1 className="mt-2 text-4xl font-black text-ink">Loading workspace</h1>
          <p className="mt-3 text-ink/60">Preparing your session and payment records.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="quid-card h-36 animate-pulse bg-haze" />
          ))}
        </div>
      </section>
    </main>
  )
}
