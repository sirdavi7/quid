## Implementation Plan: Resume checkout while a Gateway deposit confirms

### Summary
When a payer pays from a slow-finality chain, the checkout currently stops with an error after about 60 seconds, although the deposit is fine and needs 13 to 19 minutes. Change the waiting and messages so the checkout shows a calm "confirming" state, lets the payer leave, and offers "Complete payment" once Gateway has credited the deposit.

### Architecture
- Blockchain: Arc Testnet is the destination; the source can be any supported testnet chain via Circle Gateway. No contract changes.
- Contract: none.
- Frontend: one existing client component, components/pay-actions.js, reusing the live Gateway balance refresh already added.
- Wallet: unchanged. The deposit and the final payment keep their own wallet confirmations.

### Files to Create/Modify
1. components/pay-actions.js:
   - The wait for Gateway to credit the deposit still lasts up to 60 seconds, but a timeout no longer throws an error; it ends the attempt quietly and sets a "deposit confirming" notice.
   - Derive a gatewayConfirming flag from the live Gateway balance: a deposit is pending and the confirmed balance does not yet cover the payment.
   - While gatewayConfirming: the pay button is disabled with a spinner and reads "Deposit confirming...", and a calm notice explains that Gateway is confirming, that it can take about 13 to 19 minutes on chains like Ethereum, Base and Arbitrum, that the payer can leave and come back, and that their USDC stays safe in Gateway.
   - After a timed-out attempt, once the balance is confirmed, the button reads "Complete payment" and runs the same final step as today with a fresh quote and its own wallet confirmation.
   - Other failures keep their existing error messages.
   - Deposit step, fees, quotes, signatures and amounts are untouched.

### Build Sequence
1. Add the notice state and the derived gatewayConfirming flag.
2. Change the wait helper to return whether the balance was credited, and handle a timeout without an error.
3. Update the pay button label, disabled state and notice.
4. Check that the file parses and that the pay page compiles and loads; the real flow needs a test on the deployed site.

### Done When
- [ ] After a deposit from Ethereum Sepolia, the page no longer shows the "could not finish the payment" error.
- [ ] While the deposit is confirming, the button is disabled and the notice explains the wait.
- [ ] When Gateway credits the deposit, the button becomes "Complete payment" and sends the payment.
- [ ] Reloading the page during the wait still shows the confirming state.
- [ ] Only components/pay-actions.js changed; nothing about deposits, fees or signatures changed.

## Ready to build?
