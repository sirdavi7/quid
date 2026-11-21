## Implementation Plan: Small checkout and dashboard improvements

### Summary
Three display-level improvements: clearer error wording when the final payment fails after a deposit, a clearer fee box with a total and tidy decimals, and quiet live refresh for the Arc received balance and Wallet transactions. No change to how payments are made or recorded.

### Architecture
- Blockchain: Arc Testnet and USDC. No new chain calls beyond what the pages already make.
- Contract: none.
- Frontend: existing client components only.
- Wallet: unchanged.

### Files to Create/Modify
1. components/pay-actions.js: track whether Gateway has credited the deposit; if the final payment fails after that, show a message saying the USDC is deposited and confirmed, funds are safe, tap the button to retry and Quid will not deposit again (old wording stays for failures while still waiting); show the "Your Gateway balance" line with two decimals (the exact deposit amount in the fee box text keeps full precision); pass the fee box a total.
2. components/network-fee-summary.js: new row for Gateway checkouts "Total from your Gateway balance" (payment plus USDC route fees); consistent number display for fee rows (min 2, max 6 decimals; tiny values as "<0.000001").
3. components/dashboard-received-balance.js: quiet refresh every 30 seconds while the tab is visible and on return to the tab; no "Checking..." flash; keep the last balance if a refresh fails.
4. components/dashboard-wallet-activity.js: quiet check every 60 seconds while visible and on return to the tab using a "quick" request; when a new newest transaction appears, refresh the page's server data.
5. app/api/arc-activity/route.js: accept an optional quick flag restricting the check to the Arc wallet; normal requests behave exactly as today.

### Build Sequence
1. Update pay-actions.js and network-fee-summary.js.
2. Update dashboard-received-balance.js.
3. Add the quick flag to the route, then the quiet check in dashboard-wallet-activity.js.
4. Verify files parse and the home, dashboard and pay pages compile and load.
5. Report the exact files changed with git diff --stat.

### Done When
- [ ] A failure after the deposit is credited gives the new wording and a retry does not deposit again.
- [ ] The Gateway fee box shows a total from the Gateway balance and no long decimal strings.
- [ ] The Arc received balance and Wallet transactions update without a reload.
- [ ] Background checks are Arc-only.
- [ ] Payment steps, fees, signatures and recording are unchanged.

## Ready to build?
