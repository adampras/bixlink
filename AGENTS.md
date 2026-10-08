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
- Public presentation settings are centrally controlled through authenticated owner writes.
- Claim splash session before display; hydrate on public entry pages only, never in admin, so remounts cannot interrupt editing.
- Share one session store across routes; use layout-shaped placeholders.
- BIX PAY member transfers move BIX instantly in the internal ledger via a SECURITY DEFINER RPC gated by the owner-controlled bix_pay setting; owner can reverse — keeps transfers atomic and centrally controllable.
- Owner clone accounts are tracked in bix_clone_accounts and funded only via bix_allocations, excluded from public member stats — keeps internal accounts auditable and separate from real members.
- Leader virtual balances live in bix_leaders and are added inside bix_wallet_balance; withdraw RPC blocks the virtual portion until bix_leader_status reports qualified — one server-side gate for the turnover rule.
- Use cycle-safe NETWORK generation exploration and ancestry breadcrumbs with separate BIX/USDT metrics to keep unlimited depth readable.
- Keep member Settings on its dedicated route but expose it through Profile rather than primary navigation, so the main trading navigation stays focused.
- Calculate staking yield as a live display-only ledger projection from active stakes; never add projected USDT or BIX profit to spendable balances without a separate settlement rule.
- Keep the 1,000,000 BIX reserve in an owner-only singleton vault initialized idempotently; never expose it in member balances or allow repeated generation.
- Gate optional readiness surfaces through centralized app settings, and enforce identity availability and published announcement access with RLS; essential risk disclosures remain visible regardless of presentation toggles.
- Market updates use a dedicated route with the public price feed and owner-authenticated announcement writes.
- Dehydrate and hydrate the per-request QueryClient through the router so SSR and browser initially render the same market snapshot rather than fetching conflicting quotes.
- Deposits use one on-chain matcher (polling and cron), chain amounts and one credit per TxID; transfer reports stay pending for review.
- Share HOME/landing content and narratives (bundled fallbacks) through landing_content and a private bix-content bucket with published reads and owner-only writes, respecting bucket restrictions.
- Keep the public landing at / for signed-out visitors and account forms at /auth and /register; LAUNCH APP opens /auth so marketing never embeds account forms.
- Owner 2 uses scoped RPCs for packages, Market, Referral and WLT-01 only; wallet edits lock the row and preserve other wallets. Clone reviews stay excluded; vault, bonus funding, teams and other settings remain Owner 1.
- Share one horizontal category/roadmap carousel and owner-controlled content across public/member views to keep narratives, visibility and detail links consistent; reuse one CDN-backed reactor video on landing and Booster to keep playback consistent.
- Store shared owner themes in readiness with scoped semantic overrides; this preserves public presentation without widening access.
- Validate Appearance via the shared registry to preserve existing selections and owner authorization.
- On-chain deployment uses only the owner injected TokenPocket wallet and fixed-supply bytecode; store the address, never keys or internal-balance conversions.
- VIP tiers live in SQL; team sales = active downline USDT stakes minus clones; one owner-reviewed, vault-funded row per user+level — server-enforced one-time rewards.
- Network bonuses are source-stake-idempotent; native BIX ones stay owner-reviewed. USDT direct + daily matching live in bix_usdt_network_bonuses (unique per stake/receiver/level/day), split USDT/BIX by referral settings and summed into balance functions; a pg_cron job settles matching daily — one idempotent ledger for network rewards.

- Package terms use duration_apys on eight original rows; retire clones without deleting historical stakes. RPCs snapshot stake terms; native BIX alone uses owner maxApy with matching SQL/UI formulas, preserving USDT terms and existing contracts.

- Store time-based market movement in bix_market as display-only simulation with server-verified owner writes; preserve the ledger reference to avoid changing settlement or fabricating trading.
- Keep landing tokenomics in a presentation-only module, honoring visibility without changing member terms.
