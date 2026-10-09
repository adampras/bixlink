# BIXLINK Game Ecosystem: Fox Arena (phase 1)

## Goal
Members get a reason to come back every day. They earn small free vBIX rewards through activity, not luck. BIXLINK gains engagement and community growth. There is no gambling, no betting and no guaranteed profit.

## What members get
A new **ARENA** page, reached from the member home (an "Fox Arena" card) and the Profile menu. The phone bottom bar stays unchanged.

```text
/arena
 ├─ Fox Quest      daily and weekly missions
 ├─ Fox Den        your fox reactor, levels up with real activity
 └─ Leaderboard    monthly season rankings
```

### 1. Fox Quest (daily missions)
- Example missions: daily check-in, read today's market update, answer a 3-question crypto quiz, invite a member who verifies their email, keep a stake active for 7 days.
- Each mission pays a small vBIX amount the owner sets (e.g. 0.5–5 vBIX).
- **Rewards count toward the existing 100 vBIX per-account cap** and come out of the same 1,000,000 Marketing & Community pool. They are not a new money source.
- Streaks: 7 days in a row adds a bonus mission. A missed day resets the streak.
- The server checks every mission, so tapping a button alone never pays.

### 2. Fox Den (status, no payout)
- A fox emblem gets new glow tiers (Bronze, Silver, Gold, Royal Jade) from real progress: quest streak, mining status and staking level.
- It is for show and bragging rights only. It pays nothing and never changes balances.

### 3. Leaderboard seasons
- Monthly rankings by quest points (all members) and by team sales (using the existing VIP team-sales rule, clone accounts excluded).
- At season end, the owner reviews the top 10 and approves BIX prizes from the Marketing allocation. Nothing pays out automatically.
- Members appear masked (e.g. `BIX-7F3…`).

## Owner controls (Admin, new "Arena" tab)
- Turn the Arena, each mission and the leaderboard on or off.
- Set each mission's vBIX reward, the quiz questions and the season prize table.
- Review and approve season prizes.

## How BIXLINK earns, passively and honestly
- Sponsored quests: partner projects pay to appear as a mission (e.g. "follow X").
- Optional cosmetic fox skins (later phase, after a payment method exists).
- Higher retention leads to more organic staking and referrals.
None of these come from member losses.

## Always-visible disclosure
"vBIX are free promotional points within the 100 vBIX cap. Not on-chain BIX, not withdrawable until owner conversion opens. Rankings and rewards are not guaranteed."

## Technical details
- Tables: `bix_quest_claims` (user_id, quest_key, period_key, amount_vbix, created_at; unique user+quest+period), `bix_quiz_questions` (owner-managed), `bix_season_prizes` (status pending/approved/rejected, owner-reviewed). Each table gets GRANT and RLS: own read, admin read/write.
- Config in `app_settings` key `bix_arena` (enabled, missions[], rewards, season prizes), with owner-only save RPC.
- SECURITY DEFINER RPCs: `bix_quest_status()`, `bix_quest_claim(p_key)`. The claim RPC verifies the condition on the server (check-in, quiz answer hash, verified referral, active stake age), enforces the period uniqueness, checks the shared 100 vBIX cap and the pool remaining under an advisory lock, then writes to `bix_vbix_ledger` with kind `quest`. Also `bix_leaderboard(p_season)` (masked) and `bix_review_season_prize`.
- Existing mining cap and pool functions are reused so quest and mining vBIX share one limit.
- Routes: `src/routes/arena.tsx`; Admin tab `AdminArena.tsx`; home card; Profile link.
- Tests: cap shared with mining, one claim per period, the quiz needs the correct answer.
