import { AppHeader } from '@/components/app-header'

export default function Loading() {
  return (
    <main className="min-h-screen bg-paper" aria-busy="true">
      <AppHeader pending />
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 sm:pt-8">
        <div className="max-w-xl animate-pulse" role="status" aria-label="Loading workspace">
          <div className="h-6 w-28 rounded-full bg-arc/10" />
          <div className="mt-4 h-10 w-3/4 rounded-xl bg-haze" />
          <div className="mt-3 h-4 w-2/3 rounded-lg bg-haze/70" />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="quid-card h-36 animate-pulse bg-haze" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-2xl border border-arc/10 bg-haze/60" />
      </section>
    </main>
  )
}
