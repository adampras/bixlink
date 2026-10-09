# DApps Hub + BIX Explorer (and game ecosystem direction)

## Short answers
- **Can it be added?** Yes.
- **Is it good for the project?** Yes, if it shows only real data. An explorer that lets members check activity themselves builds trust. A DApps hub makes BIXLINK feel like an ecosystem, not just a staking page.
- **Honesty rule:** BIX is not on mainnet yet. So the explorer is labeled **"BIX Internal Ledger Explorer"**. It never claims to be a blockchain explorer, and it never shows invented transactions.

## Where it goes
The bottom bar on phones is already full (7 buttons), so:
- **Header:** a new grid icon "DAPPS" next to the Market icon (phone and desktop).
- **Member home:** a "BIXLINK Ecosystem" card row under the presale banner.
- **Admin:** an on/off switch for each DApp tile and for the Explorer.

```text
/dapps  (DApps Hub)
 ├─ Live apps: Stake, BIX Boost, Presale, BIX PAY, Mining, Market, Swap
 ├─ BIX Explorer  -> /explorer
 └─ Coming soon: Games (tiles shown as "Planned", not clickable)
```

## BIX Explorer (/explorer)
- Totals at the top: total BIX supply (21M fixed), members, active stakes, presale BIX locked, BIX PAY transfers (24h). All come from real records.
- **Latest activity** stream: real stakes, presale orders and BIX PAY transfers, newest first. Members are masked (e.g. `BIX-7F3…A1`). There are no emails or names, and test (clone) accounts are left out.
- Search by your own transaction ID or member code. It shows only an anonymous status and never private details.
- A permanent notice says: "Internal ledger records. Not on-chain. Mainnet not launched."

## Game ecosystem: recommendation (direction only, not built in this step)
Avoid gambling-style games (betting, lotteries, price-prediction wagers). They create legal risk and conflict with the "no guaranteed profit" rule. Better fits:
1. **Fox Quest (daily missions):** check-ins, learning quizzes and referral missions that earn vBIX inside the existing 100-per-account mining cap and the Marketing pool.
2. **Fox Den idle miner:** members upgrade a fox "reactor" with a cosmetic look. The visual effect is tied to their real stake or mining status. It is engagement only.
3. **Leaderboard seasons:** monthly team-sales rankings with owner-reviewed BIX rewards from the Marketing allocation.

Passive income for BIXLINK itself would come from optional cosmetic items, sponsored quests and ads, never from member losses. A full design for the games can be planned separately after the hub is live.

## Technical details
- New routes: `src/routes/dapps.tsx`, `src/routes/explorer.tsx`, each with its own head() metadata.
- New SECURITY DEFINER RPC `bix_explorer_feed(p_limit int)`. It returns masked rows (kind, short id, masked code, amount, created_at) from stakes, bix_presale_orders and bix_transfers, leaves out bix_clone_accounts, and is granted to anon and authenticated users. Add `bix_explorer_stats()` for the totals.
- Server function using a publishable client, with the 60s query cache.
- `app_settings` readiness flags: `dappsEnabled`, `explorerEnabled`, set from the AdminReadiness toggles.
- Header icon in BixShell; ecosystem card row on member home.
- No changes to any money logic. The explorer is read-only.
