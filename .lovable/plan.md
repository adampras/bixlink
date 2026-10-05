# BIXLINK Home Market, Pre-Login Landing, and Swap

## What will change

- Move the current promotional landing experience into the sign-in/register page, above the account form.
- Replace HOME with a member-focused staking overview containing:
  - staking totals and package statistics from the app;
  - a clearly labeled internal BIX/USDT reference chart fixed at **$0.10**;
  - live global prices for several major crypto assets, with loading/error freshness states;
  - tokenomics for the 21 million BIX supply;
  - RWA explanation, recorded income sources, and the existing roadmap phases.
- Add a two-way BIX/USDT swap panel to WALLET with live conversion preview, balances, history, and status.
- Add swap requests to the admin Wallet area for approval or rejection.
- Show a full referral URL in PROFILE with a one-click copy button; retain referral attribution through sign-up/sign-in.

## Safety and behavior

- The BIX price is an internal fixed reference, not an external market listing.
- Swaps remain non-custodial pending records and never create fabricated balances or automatic payouts.
- A user can only request a swap when their approved ledger balance is sufficient; the amount is reserved while pending.
- Admin approval changes the recorded BIX/USDT balances; rejection releases the reserved amount.

## Technical details

- Use the new `swap_requests` ledger and server-validated RPCs at the fixed $0.10 conversion rate.
- Fetch public market prices through a server function so external failures do not expose secrets or break the page.
- Reuse existing design tokens, cards, navigation, admin identity checks, and transaction status patterns.
- Keep `/dashboard` available as a compatibility redirect to HOME.

## Verification

- Check HOME, auth landing, WALLET, PROFILE, and admin Wallet on desktop and mobile.
- Verify market fallbacks, conversion math, copy actions, filters, and empty states.
- Verify build diagnostics and the public/member flows available without a test account.