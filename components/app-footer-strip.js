export function AppFooterStrip() {
  return (
    <footer className="px-3 pb-4 pt-6 sm:px-4">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-arc/10 bg-paper/70 dark:border-white/10 px-5 py-4 text-xs font-semibold text-ink/45 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-arc/40 to-transparent"
        />
        <p>&copy; 2026 Quid USDC Payments. Built on Circle and Arc.</p>
        <p>Pay links, QR codes, received balances, and withdrawals in one workspace.</p>
      </div>
    </footer>
  )
}
