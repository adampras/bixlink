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
- Owner access requires server-validated identity and verified owner email; never trust client roles.
- Public reads use RLS; private operations use authenticated server functions.
- BIX/USDT conversions are reviewed internal ledger requests at the owner reference, never exchange execution or custody.
- Owner-only presentation writes; wallet finance motion and landing payment canvas stay scoped.
- Share session store and layout placeholders.
- BIX PAY member transfers move BIX instantly in the internal ledger via a SECURITY DEFINER RPC gated by the owner-controlled bix_pay setting; owner can reverse — keeps transfers atomic and centrally controllable.
- Clone accounts (bix_clone_accounts) are funded only via bix_allocations and excluded from member stats — auditable and separate.
- Leader virtual balances (bix_leaders) count in bix_wallet_balance but withdraw is blocked until bix_leader_status qualifies — one server gate.
- NETWORK: cycle-safe exploration, ancestry breadcrumbs, separate BIX/USDT metrics.
- Calculate staking yield as a live display-only ledger projection from active stakes; never add projected USDT or BIX profit to spendable balances without a separate settlement rule.
- Keep the 1,000,000 BIX reserve in an owner-only singleton vault initialized idempotently; never expose it in member balances or allow repeated generation.
- Gate optional readiness in app settings; enforce identity and announcement access with RLS; always show essential risk disclosures.
- Hydrate per-request QueryClient through the router for matching SSR/browser market snapshots.
- Deposits use one on-chain matcher (polling and cron), chain amounts and one credit per TxID; transfer reports stay pending for review.
- Share HOME/landing content and narratives (bundled fallbacks) through landing_content and a private bix-content bucket with published reads and owner-only writes, respecting bucket restrictions.
- Owner 2 uses scoped RPCs for packages, Market, Referral and WLT-01 only; wallet edits lock the row and preserve other wallets. Clone reviews stay excluded; vault, bonus funding, teams and other settings remain Owner 1.
- Share category/roadmap carousels and CDN videos; contain media; owner times splash; manifest icons uncached.
- Themes use readiness and semantic overrides; Appearance validates against the shared registry without widening authorization.
- Deploy fixed-supply bytecode with owner TokenPocket only; store addresses, never keys or ledger conversions.
- VIP tiers live in SQL; team sales = active downline USDT stakes minus clones; one owner-reviewed, vault-funded row per user+level — server-enforced one-time rewards.
- Network bonuses are source-stake-idempotent (native BIX owner-reviewed); USDT direct/daily matching use unique rows in bix_usdt_network_bonuses settled by pg_cron — one idempotent reward ledger.
- Share daily yield control between APY and its standalone route using authorized package saves; duration_apys and RPC snapshots preserve running stakes; retire clones without deleting stakes.
- Store time-based market movement in bix_market as display-only simulation with server-verified owner writes; preserve the ledger reference to avoid changing settlement or fabricating trading.
- Tokenomics is presentation-only; honor visibility and terms.
- Settle vBIX via authenticated RPCs; video never awards funds. Convert through an atomic capped marketing ledger, never the owner vault.
- Fox Arena quest vBIX is paid only by the server-verified bix_quest_claim RPC, sharing mining's account cap and pool; season prizes are owner-reviewed, never auto-credited — game rewards stay in the promo budget.
- NFT cards: one in-app certificate per stake with immutable artwork snapshot; new artwork selection matches the contract tier through the owner-controlled reactor catalog. Completion replaces USDT refund; buybacks remain owner-reviewed and vault-funded.
- Marketplace merchandise lives in a separate owner-controlled presentation catalog with optional external HTTPS order links, not automatic payments or certificate settlement; HOME and PROFILE provide store access without a header shop.
- All presale entry points use one accessible confirmation before the authenticated purchase; strategies snapshot rates and whole-day dividends settle via bix_wallet_balance — one server source.

- Owner-only marketing settings feed browser PDF exports; dated CDN video stays separate to avoid implying re-rendering.
- Owner navigation uses one searchable category selector; shared staking controls separate daily presets from individual edits to avoid duplicate forms across consoles.
- Shared shell and dialogs own phone spacing, safe-area navigation and scroll bounds so every page remains usable without changing transaction logic.

- Size heroes only via landing-hero-compact and compact-market-hero; preserve art proportions and catalog/transaction layouts to isolate visual changes.
- Member store listings are auto-approved only by the database guard trigger (terms, photo, description, price cap, banned words, owner toggle); never approve from the client.
