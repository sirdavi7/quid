export function AppFooterStrip() {
  return (
    <footer className="border-t border-arc/10 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-xs font-semibold text-ink/45 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; 2026 Quid USDC Pay. Built on Circle and Arc.</p>
        <p>Pay links, received balances, and withdrawals in one workspace.</p>
      </div>
    </footer>
  )
}
