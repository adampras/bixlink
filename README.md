# Bixlink

Build a full-stack web app for BIXLINK Crypto Staking - ALL IN ONE DEPLOY - Use React + Tailwind + Neon mock.

BRAND IDENTITY - MUST FOLLOW EXACTLY:
- Name: BIXLINK (not BIXCOIN, not BIXCHAIN - BIXLINK is brand)
- Mascot: Blue Fox cute, blue glowing eyes, wearing tech jacket gold
- Colors: TRICOLOR ONLY
  Purple #A855F7 (primary buttons, headers)
  Neon Green #39FF14 (APY, success, active states)
  Gold #FFD700 (BIXLINK logo, prices, highlights)
  Background #0a0a23 dark, Card #151536
- Total Supply Badge: "21 JUTA BIX TOKEN" Gold color always
- Tagline: "STAKE BIXCOIN • EXCHANGE • DEFI • RWA NARRATIVE"

3 PAGES IN ONE APP (Single Page App with routing tabs):

1. LANDING PAGE (/)
   - Hero: Blue fox mascot center, title BIXLINK gold gradient 72px, subtitle RWA NARRATIVE STAKING TRICOLOR, badge "21 JUTA BIX TOKEN • Powered by BIXCOIN" purple to gold gradient, 2 CTA buttons: START STAKING NOW (gold) and WHITEPAPER (green outline)
   - Section 8 PACKAGES: Grid 4 columns desktop, 1 column mobile. Cards with alternating colors like my poster:
     SEED $10 30D 8% APY purple, SPARK $30 60D 10% green, EXPLORER $100 90D 12% gold, PIONEER $500 120D 15% purple, BUILDER $1000 180D 18% green, GUARDIAN $3000 270D 20% gold, TITAN $5000 360D 22% purple,LEGEND $10000 540D 25% gold + BOOSTER badge. Each card has Stake button gold.
   - Section BOOSTER: Title APY BOOSTER ACTIVE up to 25% BOOST green,10% direct langsung 5 levels matching profit : LV1 12% LV2 6% LV3 3% LV4 2% LV5 1% 5% RewardPlus dari total omset mingguan qualified harus direct sponsor minimal 3 with referral code BIX-267564 6 angka acak di belakang
   - Section ROADMAP: Q1 2026 Launch, Q2 2026 Staking App Beta, Q3 2026 RWA Listing, Q4 2026 Ecosystem, Q1 2027 DAO, Q2 2027 21 JUTA MILESTONE
   - Footer: bixlink.io | @bixlink_official

2. MEMBER DASHBOARD (/dashboard)
   - Top bar: Blue fox avatar, BIXLINK gold logo, Balance: 0 BIX, Wallet address prelaunch
   - Stats row 3 cards: Total Staked (purple border), Total Earnings (green border), Referral Earnings (gold border)
   - Active Stakes table: Package, Amount, Lock Date, Unlock Date, APY, Status with countdown
   - 8 Packages quick stake: same 8 cards but smaller, click to stake modal
   - Referral section: Referral link generator, unlimjted levels tree view, copy button
   - Booster progress bar tricolor: purple green gold gradient

3. ADMIN PANEL (/admin) - protected with langusung login di menu profile akun utama owner pakai email bixdevpras@gmail.com password: admin123
   - Login simple
   - Dashboard stats: Total Users, Total BIX Staked, Total BIX Supply Locked / 21 JUTA, Revenue 40% reward stake,
   - Users table: CRUD, search, ban
   - Stakes management: approve, reject, view all stakes,
   - Package settings: edit price, APY, lock days ,profit harian 1x24 jam muncul for 8 packages editable 
   - Referral settings: edit 5 levels percentage dari profit member,referral direct 10% langsung potong 70%usdt 30%bix, reward plus 5% dari omset masuk reset setiap minggu qualified minimal 3 member direct
   - RWA settings: add FOREX, CRYPTO, RWA, ADVERTISING income sources
   - Banner for APY BOOSTER toggle

DESIGN RULES:
- All cards border radius 20px, hover lift -8px with glow purple/gold
- Use lucide-react icons
- Buttons always rounded full 30px
- Mobile first 9:16 portrait optimized, images use gradient not external images
- use real BIXLINK data above no SC


Build now in one deployment

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bixlink.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/efcaebea-ddc4-48a1-a831-04522be87ae2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
