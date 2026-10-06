# English-first, 5 languages, Settings, and notifications

## What will change
- Make English the default interface language.
- Turn the existing language picker into a working five-language control using flag codes and initials: 🇬🇧 EN, 🇮🇩 ID, 🇨🇳 ZH, 🇯🇵 JA, 🇰🇷 KO.
- Translate the member navigation, shared status text, authentication, registration, HOME, WALLET, STAKE, BOOST APY, NETWORK, PROFILE, BIX PAY, TRANSFER, settings, and public landing experience.
- Add a Settings button in the top header, with language and notification preferences on a dedicated Settings page.
- Add a notification bell beside Settings. New BIXLINK updates appear in a compact dropdown, with unread count and “mark all read”.
- Keep all staking, wallet, transfer, referral, and admin transaction rules unchanged.

## Interface behavior
- Language choice persists in the browser and updates the interface immediately without reloading.
- Desktop header keeps language, notifications, Settings, and Profile aligned in one row.
- Mobile uses compact icon controls so the header remains readable.
- Notifications are informational only and do not claim deposits, payouts, or market activity.

## Technical details
- Add a small local translation system with typed language keys and no paid translation service.
- Store language, notification preference, and read notification IDs in browser storage.
- Add a `/settings` content page with complete page metadata.
- Use existing BIXLINK semantic colors and Button components; no backend or transaction schema changes.
- Verify desktop and mobile rendering, language switching, Settings navigation, notifications, and current build diagnostics.
