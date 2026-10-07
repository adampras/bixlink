# Sponsor bonus, appearance, footer, translations, and wallet conversions

## What will change
- Fix virtual-USDT sponsor rewards so the configured 10% direct bonus is recorded once when a referred member's stake becomes active, rather than remaining only a weekly projection.
- Keep RewardPlus 5% weekly qualification separate, and keep the BIX Booster 100%-BIX direct-bonus flow unchanged.
- Add the virtual-USDT direct bonus to the member's internal ledger and make it visible in NETWORK/history without implying a real payment rail.
- Make the newest Royal Gold & Jade appearance preview and applied theme more colorful, readable, responsive, and lightweight.
- Add owner-editable footer content with an OPEN/CLOSED control while retaining the essential risk disclosure when optional footer content is hidden.
- Translate the 21 million BIX supply label across all eight available interface languages.
- Use conventional grouped balance numbers and show display-only conversions below the wallet balance for IDR, MYR, CNY, INR, SGD, AED, and ZAR.

## Verification
- Test referral assignment, three separate USDT stakes, activation, one-time 10% bonus entries, and balance/history updates without duplicate credits.
- Verify RewardPlus and BIX Booster referral rules remain separate.
- Check Appearance, footer editing/toggle, language switching, and wallet conversions on desktop and mobile.
- Confirm current diagnostics and focused tests pass.

## Technical details
- Add an idempotent database ledger for virtual-USDT direct bonuses, keyed to the source stake and created only on stake activation.
- Read the owner-managed direct percentage at activation time; use database-side authorization and atomic accounting.
- Store bounded footer presentation fields in the existing public readiness setting and validate owner updates through authenticated server functions.
- Fetch public USD FX reference rates server-side with safe fallback rates; conversions remain informational only.
