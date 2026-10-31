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
- Sovereign Wallet owns in-place account screens and reuses authenticated ledger RPCs; virtual USDT stays explicitly separate from asset USDT, preventing accidental balance substitution.
- Sovereign market: read-only terminal with timestamped public-data caches; signature login reuses WalletSignIn with an in-place callback so identities/authorization stay unchanged.
- BIX PAY member transfers move BIX instantly in the internal ledger via a SECURITY DEFINER RPC gated by the owner-controlled bix_pay setting; owner can reverse — keeps transfers atomic and centrally controllable.
- Clone accounts (bix_clone_accounts) are funded only via bix_allocations and excluded from member stats — auditable and separate.
- Leader virtual balances (bix_leaders) count in bix_wallet_balance but withdraw is blocked until bix_leader_status qualifies — one server gate.
- NETWORK: cycle-safe exploration, ancestry breadcrumbs, separate BIX/USDT metrics.
- Calculate staking yield as a live display-only ledger projection from active stakes; never add projected USDT or BIX profit to spendable balances without a separate settlement rule.
- Keep the 1,000,000 BIX reserve in an owner-only singleton vault initialized idempotently; never expose it in member balances or allow repeated generation.
- Gate optional readiness in app settings; enforce identity and announcement access with RLS; always show essential risk disclosures.
- Hydrate per-request QueryClient through the router for matching SSR/browser market snapshots.
- Deposits: one on-chain matcher (polling/cron), one credit per TxID; manual owner recovery re-verifies on-chain and credits the chain amount, Owner 2 scoped to its wallets/downline.
- Share HOME/landing content and narratives (bundled fallbacks) through landing_content and a private bix-content bucket with published reads and owner-only writes, respecting bucket restrictions.
- Owner 2 uses scoped RPCs (packages, Market, Referral, WLT-01), each gated by reviewer_permissions in DB and server; clones excluded; everything else stays Owner 1.
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
- Arena artwork uses shared bundled mission assets; owner saves read back canonical configuration and invalidate member Arena queries to keep displayed rewards synchronized without changing prior claims.
- Arena and onboarding share bundled game artwork and reduced-motion-aware CSS depth; onboarding reads canonical welcome rewards and never hides claim errors.
- BNB login may provision wallet-only members after an origin/purpose-bound single-use signature with atomic profile/referral/mapping (no duplicates); internal wallet emails never pass real-email checks; session exchange grants no roles or funds.
- NFT cards: one in-app certificate per stake with immutable artwork snapshot; new artwork selection matches the contract tier through the owner-controlled reactor catalog. Completion replaces USDT refund; buybacks remain owner-reviewed and vault-funded.
- Marketplace merchandise is an owner-controlled presentation catalog with optional external HTTPS order links (no payments/settlement); store entry from HOME/PROFILE only; member listings auto-approve only via the DB guard trigger.
- All presale entry points use one accessible confirmation before the authenticated purchase; strategies snapshot rates; dividends settle via bix_wallet_balance.
- Presale stage edits use shared atomic helpers and validator; owner saves merge and read back stored config without resetting orders.
- Owner-only marketing settings feed browser PDF exports; dated CDN video stays separate to avoid implying re-rendering.
- Enforce virtual sender authorization in the shared RPC and insert guard, and developer buyback limits with a table trigger as well as shared input validation; direct API calls must not bypass the wallet rules.
- Serve the English company overview as a versioned, dated PDF with page-image previews; changes to live financial settings require regeneration, not changes to the dated video.
- Owner navigation uses one searchable category selector; shared staking controls separate daily presets from individual edits to avoid duplicate forms across consoles.
- Shell/dialogs own phone bounds; consortium uses a centered portal stage to avoid legacy transforms. Package cards use inline durations and full-width actions.
- All loan dialog states share a Radix body portal with isolated surface tokens; this avoids shell transforms and transparent theme overrides while retaining focus trapping.
- Size heroes via landing-hero-compact/compact-market-hero; preserve catalogs. Mask vault art behind the transparent coin to blend themes without new assets.
- Keep app-wide touch feedback and HOME return-to-top in one root-mounted presentation component; store its switch in existing owner-authorized readiness settings to avoid duplicate controls or new permissions.
- Growth features share an authoritative singleton control and cycle-safe database scope; exclude delegated-owner ancestry on reads and withdrawal guards so client presentation cannot bypass safety. Flash events never change contract terms; public activity contains only masked verified deposit records, never inferred payouts.
- Share wallet staking notifications from authenticated stake records and status-specific IDs; receipts read back the RPC result without inferring completion or settlement.
- Select the manifest from the root matched location during SSR; keep Sovereign Wallet manifest identity and scope stable so installation launches its existing in-place screens.
- BIXTOK LIVE: LiveKit VP8 (adaptiveStream off: video is bound manually) with P2P fallback in src/lib/bixtok-rtc.ts; chat broadcast+db+polling de-duped by id. Official hosts via bixtok_is_official (Owner 1 + bixtok_official_hosts). PK score is display-only from gift rows; replays are host-recorded parts under the media limit.
