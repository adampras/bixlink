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
- Show the startup splash once per browser session from the root layout, so navigation inside the member area remains uninterrupted.
- Resolve the member session once per app load from a shared module-level store and reuse it across routes, so switching menus never re-queries auth or flashes a raw loader; show a layout-shaped placeholder instead.
- BIX PAY member transfers move BIX instantly in the internal ledger via a SECURITY DEFINER RPC gated by the owner-controlled bix_pay setting; owner can reverse — keeps transfers atomic and centrally controllable.
- Owner clone accounts are tracked in bix_clone_accounts and funded only via bix_allocations, excluded from public member stats — keeps internal accounts auditable and separate from real members.
- Leader virtual balances live in bix_leaders and are added inside bix_wallet_balance; withdraw RPC blocks the virtual portion until bix_leader_status reports qualified — one server-side gate for the turnover rule.
- Member USDT deposits are credited only after server-side on-chain verification (receipt, recipient = owner wallet, USDT contract, confirmations) with one credit per TxID; amount comes from chain, never from user input — prevents fabricated balances.
- Render the referral network as a cycle-safe recursively expandable tree without a fixed depth cap, so deep generations remain navigable without loading every branch at once.
- Keep interface translations in the shared local i18n provider and persist member language preferences in browser storage, so all routes switch together without a paid translation dependency.
- Keep member Settings on its dedicated route but expose it through Profile rather than primary navigation, so the main trading navigation stays focused.
- Calculate staking yield as a live display-only ledger projection from active stakes; never add projected USDT or BIX profit to spendable balances without a separate settlement rule.
- Keep the 1,000,000 BIX reserve in an owner-only singleton vault initialized idempotently; never expose it in member balances or allow repeated generation.
- Gate optional readiness surfaces through centralized app settings, and enforce identity availability and published announcement access with RLS; essential risk disclosures remain visible regardless of presentation toggles.
- Keep market updates in a dedicated route using the existing public price feed and owner-authenticated announcement writes, so prices and official project communications remain clearly separated.
- Dehydrate and hydrate the per-request QueryClient through the router so SSR and browser initially render the same market snapshot rather than fetching conflicting quotes.
- Deposits: unique exact amount matched on chain by one shared matcher (page polling + 5-min cron route); "I have transferred" adds a pending row the owner can approve — one credit path, no double credit.

- Share HOME and landing image/visibility content through landing_content; keep image objects in the private bix-content bucket with public read policy and owner-only upload/delete policies, so workspace public-bucket restrictions remain respected.
- Keep the public landing at / for signed-out visitors and account forms at /auth and /register; LAUNCH APP opens /auth so marketing never embeds account forms.
- Surface the limited Owner 2 review console only when the signed-in account has the database-backed reviewer role, so client state never grants or advertises reviewer access.
- Include reviewer in the user_roles database constraint and verify role writes by reading them back before reporting success, so Owner 2 assignments cannot silently fail.
