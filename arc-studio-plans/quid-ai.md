## Implementation Plan: Quid AI

### Summary
A floating **Q** button in the bottom right of every page for signed-in users. It opens an assistant that explains Quid, answers questions about your own payments and wallet balance (read-only), and can **draft** a USDC withdrawal that only moves money after you tap Confirm. Testnet only (Arc Testnet).

### Provider recommendation and setup
- Use the Vercel AI SDK with Vercel AI Gateway. Quid already ships with a `vercel.json`, so it deploys on Vercel. Gateway gives one API key and lets you pick or change the model with a single environment variable.
- Pick a small, fast, low-cost model. The model name goes in `QUID_AI_MODEL`. The build step checks the provider's current model list instead of hard-coding a name.
- Setup: create an AI Gateway key in the Vercel dashboard; add `AI_GATEWAY_API_KEY` and `QUID_AI_MODEL` to the Vercel project environment variables and the app's `.env`; optional `QUID_AI_DAILY_LIMIT` (default 30); run the new SQL file once in the Supabase SQL editor. Never paste keys in chat.
- To use a provider directly instead, swap in that provider's package and key; the rest of the plan stays the same.

### Architecture
- Blockchain: Arc Testnet and USDC only. The assistant refuses to act if `QUID_NETWORK` is not `testnet` (reuse `getOnchainActionBlockMessage`).
- Contract: none.
- Frontend: Next.js 14 and React 18. New packages: `ai`, `@ai-sdk/react`, `zod`. Pin exact versions and follow the docs for the installed version, since API names changed between major versions.
- Wallet: unchanged. Money moves only through the existing `POST /api/payouts`, called by a user tap in the browser.

Safety rules:
1. Signed-in only. The server reads the user from the session; the model never receives or chooses a user ID.
2. Tools are read-only except `draft_withdrawal`, which only validates and returns a draft. No AI code imports the Circle send function or calls `/api/payouts`.
3. A withdrawal happens only when the user taps Confirm on a card showing the server-validated recipient and amount. The tap calls the same `/api/payouts` route as the manual form, with the same checks.
4. Other people's text (payment notes, page names) is data: truncated, labeled untrusted in tool results, and never followed as instructions.
5. Cost control: per-user daily limit, input capped near 1,000 characters, last 12 messages only, short max output, small cap on tool steps.
6. Never claim funds moved unless a record says so; say when unsure and point to the receipt or ArcScan.
7. v1 drafts only direct Arc Testnet withdrawals. Gateway deposits and withdrawals are explained with links to the wallet controls.

### Files to Create/Modify
1. components/quid-ai-launcher.js: floating Q button (`/brand/quid-q.png`) bottom right; panel on desktop, bottom sheet on mobile (dvh aware, 44px targets); Escape and outside click close it; focus returns to the button; reduced motion and dark mode.
2. components/quid-ai-panel.js: chat UI with `useChat`; renders message parts; suggested prompt chips; testnet and "can make mistakes" notice; loading and error states; chat clears on reload in v1.
3. components/quid-ai-withdraw-card.js: confirmation card for a drafted withdrawal; states idle, submitting, submitted (explorer link), failed, cancelled; locks after confirm or cancel.
4. components/app-header.js: render the launcher only when `account` is set and the header is not pending.
5. app/api/ai/chat/route.js: authenticate, enforce daily limit, stream model reply, register tools.
6. lib/ai/system-prompt.js: Quid facts, tone, safety rules, testnet-only statement.
7. lib/ai/tools.js: user-scoped tools get_account_summary, list_recent_payments (max 10), get_wallet_balance (same RPC as app/api/arc-balance/route.js), draft_withdrawal (validateAddress, validateAmount, network check, live wallet check, balance check; returns draft only).
8. lib/ai/rate-limit.js: per-user daily message count with a friendly limit message.
9. supabase/quid_ai_usage.sql: small table keyed by user and day, RLS on, server admin client access only (same style as existing supabase/*.sql).
10. env.local.example: document AI_GATEWAY_API_KEY, QUID_AI_MODEL, QUID_AI_DAILY_LIMIT.
11. package.json and package-lock.json: add the packages.

### Build Sequence
1. Add packages; read the installed SDK docs and use its current streaming and tool API.
2. Write the SQL file, rate limiter and env example entries.
3. Write the system prompt and tools; confirm nothing under lib/ai imports lib/circleWallets.
4. Build app/api/ai/chat/route.js: 401 signed out, clear "not configured" message without a key, 429 over limit.
5. Build launcher, panel and withdraw card; wire Confirm to POST /api/payouts.
6. Mount the launcher from AppHeader.
7. Verify on the dev server: pages compile, route returns 401 signed out, launcher hidden signed out, key-missing message appears. Live model answers, a real withdrawal and the Supabase limit need keys and must be checked by the user after setup.

### Done When
- [ ] Q button shows bottom right on signed-in pages only; panel on desktop, bottom sheet on mobile.
- [ ] Signed out, POST /api/ai/chat returns 401 and no launcher renders.
- [ ] With keys set, the assistant answers Quid questions and explains the user's own payment statuses and balance.
- [ ] A withdrawal request produces a draft card; no money moves until Confirm; the card cannot be submitted twice.
- [ ] No AI code can call the Circle send function or /api/payouts itself (confirmed by search).
- [ ] The daily limit blocks extra messages with a clear message.
- [ ] Works in dark mode and with reduced motion; does not cover primary buttons on the pay page on mobile.
- [ ] No keys in the repo or the browser.

## Ready to build?
