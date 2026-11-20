## Implementation Plan: Reliable incoming transfer history

### Summary
Make every incoming USDC transfer to a Quid receive wallet appear in Wallet transactions, Quid money movement and Recent activity, no matter when the dashboard is opened. Plain wallet transfers, QR scans and faucet drips should behave like withdrawals do today.

### Architecture
- Blockchain: Arc Testnet and USDC (0x3600...0000). Other chains keep their existing recent-window scan.
- Contract: none.
- Frontend: Next.js 14. Changes are in one API route, one new helper, the store, and the dashboard activity component.
- Wallet: unchanged.
- Data source: ArcScan public API (https://testnet.arcscan.app/api/v2/addresses/{address}/token-transfers, ERC-20, incoming USDC), paged. The existing block-window scan stays as a fallback and results from both are merged. No new database table is needed.

Findings behind this plan:
- Withdrawals are written to the database when submitted, so they show everywhere.
- Plain transfers are found only by a scan run when the dashboard opens, covering about 750 blocks (10 chunks of 75). Arc produces about 1.9 blocks per second, so that window is roughly 6 to 7 minutes.
- Quid money movement reads only payment records, so plain transfers never appear there.
- Server-rendered cards (Recent activity, money movement list) do not refresh after the client-side sync finishes.

### Files to Create/Modify
1. Check only, no changes: in Build mode run git diff on app/api, lib, components/dashboard-wallet-activity.js and app/dashboard/page.js and report whether anything beyond class names or the header changed.
2. lib/arcscan.js (new): fetch incoming USDC transfers for a wallet from ArcScan; 8 second timeout; at most 3 pages; stop early at an already stored tx hash; ignore zero-value transfers; return records in the shape the route already builds.
3. app/api/arc-activity/route.js: for the Arc wallet use ArcScan plus the existing window scan, dedupe by tx hash; save each new transfer as a wallet-activity row and a confirmed incoming payment row (note "Direct deposit" or "Faucet deposit", real block timestamp); return the count of rows actually inserted; return a clear warning if both sources fail.
4. lib/store.js: let createPaymentRecord accept an optional original timestamp so backfilled rows sort by when they happened; make the Checkout USDC total count only operation "checkout" payments.
5. components/dashboard-wallet-activity.js: when a sync inserted rows, call router.refresh(); also re-sync every 30 seconds while the tab is visible and on tab focus; show "Last checked" and a visible notice when the latest check failed even if saved items exist.
6. app/dashboard/page.js: no logic change expected; re-check labels so direct deposits read clearly in the money movement list.

### Build Sequence
1. Do the diff check and report the result.
2. Write lib/arcscan.js and verify parsing against a saved sample of the ArcScan response (the sandbox has no access to the user's database or wallet).
3. Update the store helpers.
4. Update the route: ArcScan plus fallback scan, activity row and payment row, dedupe, inserted count, failure warning.
5. Update the dashboard activity component.
6. Verify on the dev server: pages compile, route returns 401 signed out, parsing check passes. Real syncing needs the user's Supabase keys and must be tested after deploy.
7. After deploy, send a small plain transfer to the wallet, open the dashboard after more than 10 minutes, and confirm it appears in Wallet transactions, Quid money movement and Recent activity; older missed transfers should backfill on the first sync.

### Done When
- [ ] The diff check confirms the redesign did not change payment-recording logic, or shows exactly what changed.
- [ ] A plain transfer received while the dashboard was closed appears in Wallet transactions, Quid money movement and Recent activity after the next dashboard visit.
- [ ] Transfers missed since Oct 22 are backfilled in correct date order.
- [ ] The Checkout USDC card still counts only checkout payments.
- [ ] Recent activity and the money movement list update right after a sync without a manual reload.
- [ ] If ArcScan and the fallback scan both fail, the dashboard says so.
- [ ] No duplicate rows when the same transfer is found twice.

## Ready to build?
