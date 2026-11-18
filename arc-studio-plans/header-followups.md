## Implementation Plan: Quid header follow-ups

### Summary
Finish the header and page polish for Quid, a USDC payment-page app: show the wallet pill on the dashboard, bring hand-written corner styles in line with the new header, and remove the two unused menu components. The notification bell is intentionally out of scope for now.

### Architecture
- Blockchain: no change. Arc Testnet and USDC stay as they are.
- Contract: none.
- Frontend: Next.js 14 (app router) with Tailwind. Styling-only changes plus one prop and two deleted files.
- Wallet: RainbowKit and wagmi are already provided globally. The header wallet pill reuses `components/header-wallet-pill.js`.

### Files to Create/Modify
1. app/dashboard/page.js: pass `showWallet` to `AppHeader` so the wallet pill appears on the dashboard.
2. app/page.js: change the home hero buttons and chip from `rounded-md` to `rounded-xl`.
3. app/pay/[username]/page.js: update the avatar tile, info boxes and the "Edit" chip corners.
4. app/dashboard/page.js (same file as 1): update the remaining `rounded-md` tiles, badges and dashed empty-state box.
5. components/*.js with hand-written corners: create-page-form, edit-page-form, login-form, reset-password-form, pay-actions, receive-card, scan-pay-card, creator-wallet-panel, dashboard-chain-wallets, dashboard-wallet-activity, network-fee-summary, payment-status-card, home-showcase. Replace `rounded-md` with `rounded-xl`, except tiny elements (h-7/h-8 tiles and `px-2 py-1` badges), which become `rounded-lg`.
6. app/globals.css: add `rounded-xl` to the existing reduced-motion selectors that currently match `rounded-md` and `rounded-lg`, so reduced-motion behavior is preserved after the change.
7. components/dashboard-nav-menu.js and components/site-nav-menu.js: delete. Nothing imports them (confirmed by search).

### Build Sequence
1. Delete the two unused menu files with `git rm`.
2. Turn on `showWallet` in the dashboard header.
3. Run a scripted replacement of `rounded-md` across `app/` and `components/`, using the rule in item 5, then review the diff for anything that looks wrong.
4. Update the reduced-motion selectors in `app/globals.css` (item 6).
5. Restart the dev server if it has stopped, then request `/`, `/pay/x`, `/dashboard`, `/settings`, `/create`, `/login` and `/reset-password` one at a time and confirm each returns 200 with no compile errors in the log.

### Done When
- [ ] `dashboard-nav-menu.js` and `site-nav-menu.js` are gone and no import errors appear.
- [ ] The dashboard header shows the wallet pill (Connect wallet, address and network, or Wrong network).
- [ ] `grep -rn "rounded-md" app components` returns no results.
- [ ] Buttons, inputs and boxes across the app share the same rounded look as the header.
- [ ] All seven pages compile and respond with HTTP 200.
- [ ] No notification bell code is added.

## Ready to build?
