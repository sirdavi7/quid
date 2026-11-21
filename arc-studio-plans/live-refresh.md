## Implementation Plan: Live refresh for money movement and Gateway balance

### Summary
Make Quid money movement update by itself when payment records appear or change, and keep the "Your Gateway balance" line on the checkout current. Display refresh only. No change to how payments are made, recorded or confirmed.

### Architecture
- Blockchain: Arc Testnet and USDC. No new chain calls beyond the existing Gateway balance read.
- Contract: none.
- Frontend: Next.js 14 client components. Uses the Supabase Realtime channel already used by the dashboard, and the existing Unified Balance kit call already used by the checkout.
- Wallet: unchanged.

### Files to Create/Modify
1. components/transaction-status-sync.js: always subscribe to changes in the owner's payment records (inserts and updates), batch events into one page-data refresh, keep the existing 5-second reconcile only while something is pending, fall back to a refresh about once a minute (while the tab is visible) if Realtime is not connected, and refresh once when returning to the tab after more than 15 seconds away.
2. app/dashboard/page.js: no change needed; the component is already mounted unconditionally and previously exited early.
3. components/pay-actions.js: while a wallet is connected, a non-Arc chain is selected and the wallet is on that chain, re-read the Gateway balance every 25 seconds while the tab is visible and not busy, and once right after a deposit or payment finishes. Update only the displayed Gateway balance and confirming lines; a newly loaded quote replaces the live value. Payment steps, quotes and confirmations stay untouched.

### Build Sequence
1. Update components/transaction-status-sync.js.
2. Update the Gateway balance effect in components/pay-actions.js.
3. Verify on the dev server that the dashboard and pay page compile and load (the sandbox has no Supabase keys or wallet, so live behavior is confirmed after deploy).
4. Report exactly which files changed with git diff --stat.

### Done When
- [ ] A new payment record appears in Quid money movement without reloading (Realtime on in Supabase; otherwise within about a minute).
- [ ] A pending payment turning confirmed still updates on its own.
- [ ] The Gateway balance line updates on its own and "(X confirming)" resolves without a reload.
- [ ] Only transaction-status-sync.js and pay-actions.js changed; no payment, recording or styling changes.

## Ready to build?
