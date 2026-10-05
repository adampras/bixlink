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
- Treat BIX/USDT conversion as an admin-reviewed internal ledger request at the fixed reference price; this prevents implied exchange execution or custody.
- Store owner-selected presentation options in public app settings and validate updates through authenticated admin server functions, so members see one centrally controlled experience.
- Show the startup splash once per browser session from the root layout, so navigation inside the member area remains uninterrupted.
