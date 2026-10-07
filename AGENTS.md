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
- Treat BIX/USDT conversion as an admin-reviewed internal ledger request at the owner-managed reference price; this prevents implied exchange execution or custody while keeping display and calculations consistent.
- Store owner-selected presentation options in public app settings and validate updates through authenticated admin server functions, so members see one centrally controlled experience.
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
- Deposits: credited only after server-side on-chain verification (amount from chain, one credit per TxID); unique exact amount matched on chain by one shared matcher (page polling + 5-min cron route); "I have transferred" adds a pending row the owner can approve — one credit path, no double credit.
- Share HOME/landing content and narratives (bundled fallbacks) through landing_content and a private bix-content bucket with published reads and owner-only writes, respecting bucket restrictions.
- Keep the public landing at / for signed-out visitors and account forms at /auth and /register; LAUNCH APP opens /auth so marketing never embeds account forms.
- Owner 2 discovery uses a shared role query; reviewer actions exclude clone transactions on reads and writes. Package editing uses a separate authenticated, narrowly scoped RPC; wallet-address and vault privileges remain owner-only.
- Render income-category and roadmap cards through shared components with bundled default images and owner-upload overrides, so public and member views stay consistent.
- Store the owner-selected presentation theme inside the existing public readiness setting and apply semantic CSS overrides in the shared shell, so all visitors receive the same lightweight theme without widening database access.
- BIXCOIN on-chain token is deployed only from the owner's own injected wallet (TokenPocket) with a fixed-supply bytecode compiled in src/lib; the app stores only the resulting address in app_settings and never holds keys or converts internal balances.
- VIP tiers live in SQL; team sales = active downline USDT stakes minus clones; one owner-reviewed, vault-funded row per user+level — server-enforced one-time rewards.
- Network bonuses are source-stake-idempotent; native BIX ones stay owner-reviewed. USDT direct + daily matching live in bix_usdt_network_bonuses (unique per stake/receiver/level/day), split USDT/BIX by referral settings and summed into balance functions; a pg_cron job settles matching daily — one idempotent ledger for network rewards.

- Package terms use duration_apys on eight original rows; retire clones without deleting historical stakes. A duration-aware atomic RPC snapshots APY/lock/price into new stakes, preserving existing contracts and bonus triggers.
