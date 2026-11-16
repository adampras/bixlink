# Page-loading recovery audit

Rule: a failed page download must leave a visible retry or return control, not a blank screen.

## Route definitions read

All content route definitions were read for component loading, local error handlers and metadata. The generated route tree was read to confirm inheritance. All 49 component-bearing leaf module endpoints returned HTTP 200.

- Shared eager fallback: About, Admin, Arbitrage, Arena, Auth, BIXGO, BIXTOK, BIXTrade, Boost tiers, Boost, Buyback, Call, Care, Coming soon, Consortium vault, Content detail, Dashboard, Ecosystem, Exchange, Gold, Leader control, Marketing, Mining, Network, NFT Marketplace, Owner desk, P2P, Pay, Presale, Privacy, Profile, Profit, Quantum exchange, Register, Reset password, Review, Risk, Settings, Sovereign Wallet, Stake, Studio, Terms, Trade, Transfer, Wallet, Whitepaper, Yield control.
- HOME and Market: local error handlers use shared recovery and provide retry controls. If their own handler chunk fails, the eagerly imported router fallback remains available.
- Root: shared recovery and retry controls; router catches render/import failures and browser preload/error/rejection events share a bounded reload budget.
- Dashboard/other redirect-only paths: no component chunk to download; destination follows the same router fallback.

## Alternate implementations read

- BIXGO booking and driver/floating maps: lazy Leaflet map wrapped in Suspense and ClientOnly. Rejections reach the eager route fallback; loading text is present. Floating map mirrors the current rendered view.
- BIXTOK mini/LIVE: lazy import retries are caught, then a Reload/Close view replaces the missing module; Suspense displays loading text.
- QR scanner camera/gallery and Sovereign Wallet gallery scan: library import failures are caught and shown as visible errors, with retry/gallery/back controls.
- BIX CALL onboarding photo/status: dynamic import is inside try/catch, errors remain visible and the saving state clears.
- BIX CALL connection: LiveKit import is caught, connection becomes `fail` and displays “Gagal tersambung”; optional notification/bridge imports are caught without replacing the page. Audio/video behavior was not changed.
- Deposit polling endpoint, Telegram endpoint, FOX AI endpoint, email preview and email webhook: server-only handlers, not browser route-component downloads. Read handler implementations; no affected page-module loading path. No calls, jobs, database functions or financial records were changed or executed by this audit.
- Push worker: no dynamic import; cannot fetch the reported Profile split module. Database functions do not execute browser route imports and are outside this browser-loading failure.

## Improvement

Automatic stale-page recovery now avoids document reload while offline, preserving the existing shell/fallback and the bounded retry budget. User-triggered retry still refreshes the document, because a rejected module import can remain cached for that document.

## Verification

- Profile original module HTTP 200; signed-in Profile renders without the reported error.
- Deliberately blocked Profile module shows fallback; removing the block and pressing Try again restores signed-in Profile on phone and desktop.
- Deliberately blocked Wallet, Network, Call, BIXTOK, BIXGO and Presale modules each show visible shared recovery controls.
- Twelve recovery regression tests passed. Automatic build reports build OK.

Limits: the user's connected preview tab did not return inspection results (two timeouts), so its open historical error could not be cleared/confirmed directly. Physical APK and the published old bundle were not tested; publishing is still required. LIVE, camera, maps and actual calls were audited in code, not exercised with hardware or counterparties. No funds moved and permissions/settings/data remain unchanged.