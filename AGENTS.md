<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep staking requests as non-custodial, pending records with no automatic payout or fabricated wallet balance; this app does not integrate a payment rail.
- Grant owner access only after server-validated identity and a matching verified owner email; client state is never an authority for admin actions.
- Read public package and settings data with RLS and run account-specific operations with authenticated server functions; this separates public browsing from private records.
- BIX/USDT conversions are reviewed internal ledger requests at the owner reference, never exchange execution or custody.
- Presentation settings use authenticated owner writes for central control.
- Share one session store across routes; use layout-shaped placeholders.
- BIX PAY member transfers move BIX instantly in the internal ledger via a SECURITY DEFINER RPC gated by the owner-controlled bix_pay setting; owner can reverse — keeps transfers atomic and centrally controllable.
- Clone accounts (bix_clone_accounts) are funded only via bix_allocations and excluded from member stats — auditable and separate.
- Leader virtual balances (bix_leaders) count in bix_wallet_balance but withdraw is blocked until bix_leader_status qualifies — one server gate.
- Use cycle-safe NETWORK generation exploration and ancestry breadcrumbs with separate BIX/USDT metrics to keep unlimited depth readable.
- Calculate staking yield as a live display-only ledger projection from active stakes; never add projected USDT or BIX profit to spendable balances without a separate settlement rule.
- Keep the 1,000,000 BIX reserve in an owner-only singleton vault initialized idempotently; never expose it in member balances or allow repeated generation.
- Gate optional readiness surfaces through centralized app settings, and enforce identity availability and published announcement access with RLS; essential risk disclosures remain visible regardless of presentation toggles.
- Dehydrate and hydrate the per-request QueryClient through the router so SSR and browser initially render the same market snapshot rather than fetching conflicting quotes.
- Deposits use one on-chain matcher (polling and cron), chain amounts and one credit per TxID; transfer reports stay pending for review.
- Share HOME/landing content and narratives (bundled fallbacks) through landing_content and a private bix-content bucket with published reads and owner-only writes, respecting bucket restrictions.
- Owner 2 uses scoped RPCs for packages, Market, Referral and WLT-01 only; wallet edits lock the row and preserve other wallets. Clone reviews stay excluded; vault, bonus funding, teams and other settings remain Owner 1.
- Share category/roadmap carousels and one CDN-backed video registry across landing and Booster; contain video vignettes within their stage so headings and balances stay visible; public-entry splash uses owner timing; install icons use a manifest without caching.
- Store shared themes in readiness with scoped semantic overrides; validate Appearance through the shared registry to preserve selections and owner authorization without widening access.
- On-chain deployment uses only the owner injected TokenPocket wallet and fixed-supply bytecode; store the address, never keys or internal-balance conversions.
- VIP tiers live in SQL; team sales = active downline USDT stakes minus clones; one owner-reviewed, vault-funded row per user+level — server-enforced one-time rewards.
- Network bonuses are source-stake-idempotent (native BIX owner-reviewed); USDT direct/daily matching use unique rows in bix_usdt_network_bonuses settled by pg_cron — one idempotent reward ledger.
- Package terms use duration_apys; RPCs snapshot stake terms and clones retire without deleting stakes — existing contracts never change.
- Store time-based market movement in bix_market as display-only simulation with server-verified owner writes; preserve the ledger reference to avoid changing settlement or fabricating trading.
- Keep landing tokenomics in a presentation-only module, honoring visibility without changing member terms.
- Settle vBIX via authenticated RPCs; video never awards funds. Convert through an atomic capped marketing ledger, never the owner vault.
- Fox Arena quest vBIX is paid only by the server-verified bix_quest_claim RPC, sharing mining's account cap and pool; season prizes are owner-reviewed, never auto-credited — game rewards stay in the promo budget.
- NFT cards: one in-app certificate per stake with immutable artwork snapshot; new artwork selection matches the contract tier through the owner-controlled reactor catalog. Completion replaces USDT refund; buybacks remain owner-reviewed and vault-funded.
- Marketplace merchandise lives in a separate owner-controlled presentation catalog with optional external HTTPS order links, not automatic payments or certificate settlement; HOME and PROFILE provide store access without a header shop.
- Presale strategies (hybrid/dividend/founder) snapshot owner rates per order in bix_presale_buy_strategy; USDT dividends settle as whole elapsed days inside bix_wallet_balance via bix_presale_dividend — one server source, no cron.
