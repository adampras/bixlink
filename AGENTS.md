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
