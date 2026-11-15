# Route recovery sweep

## Rule
Every screen must remain recoverable when a deployed route or lazy-loaded component is stale. Automatic recovery is bounded; ordinary retries must finish invalidating loader data before resetting the error boundary.

## Code coverage
- Root error boundary covers: /about, /admin, /arbitrage, /arena, /auth, /bixgo, /bixtok, /bixtrade, /boost-tiers, /boost, /buyback, /call, /care, /coming-soon, /consortium-vault, /content/$group/$index, /dashboard, /ecosystem, /exchange, /gold, /leader-control, /marketing, /mining, /network, /nft-marketplace, /owner-desk, /p2p, /pay, /presale, /privacy, /profile, /profit, /quantum-exchange, /register, /reset-password, /review, /risk, /settings, /sovereign-wallet, /stake, /studio, /terms, /trade, /transfer, /wallet, /whitepaper, /yield-control. Read each route registration; all inherit root recovery. Fixed the root retry to await the same shared helper as leaf boundaries.
- HOME and Market have distinct leaf boundaries. Read both; each already uses the shared recovery hook and awaited loader invalidation.
- Router catch, window error, rejected promise and Vite preload events share the session-storage recovery budget: three reloads per minute, fifteen-second duplicate cooldown.
- BIXGO booking and trip maps use React.lazy; failed module imports propagate to the shared boundary. Read their loaders: compliant.
- BIXTOK LIVE catches import failures locally and offers reload/close after three tries. Replaced its blank suspense state with visible loading feedback; retained bounded retries and explicit reload/close.
- QR scanner and BIX CALL library loads show their own camera/connection error states; no blank-screen propagation.
- Pull-to-refresh explicitly reloads, AppUpdateNotice only announces a changed build, and the messaging service worker does not cache application pages. Read all three; no automatic reload loops.
- Server error HTML supplies explicit retry/home controls. HTTP API routes, deposit/Telegram jobs and database functions do not render React route components; not applicable to this browser error. No financial functions or records changed.
- Every content route declares its own head metadata; no metadata changes needed for this repair.

## Verification
- Opened 50 paths, including all static content routes, a dynamic content example and unknown-route fallback: no blank screens or reported missing-component error.
- Browser session restored from the requesting user's minted session, but some gated screens remained in session-restoration states; this does not verify their authenticated internal flows.
- BIXCARE recovery stayed at /care; directory search and Laundry selection worked at phone dimensions.
- Nine regression tests passed, including asynchronous retry ordering and bounded reload attempts. Automatic build reported OK.
- Separate hydration warnings appeared on ecosystem, exchange, marketplace, presale and quantum-exchange screens. They regenerated visibly and are not evidence of the reported missing-component failure; no unrelated presentation/business changes made.
- Physical APK and old published bundle behavior remain unverified.