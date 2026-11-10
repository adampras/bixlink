# BIX CALL / BIXGO native handoff

This repository remains the TanStack web/server application. No APK or Android project is generated here. Capacitor core and push APIs are optional, dynamically loaded adapters for a separately maintained native host. Never point a static Capacitor webDir at the SSR server output.

## Firebase
- Connect `firebase_messaging` in Lovable. This turn's connection was declined, so no FCM sending code is enabled and existing VAPID delivery remains unchanged.
- Use HTTP v1 through the connector, never a legacy Server Key or exposed service account.
- Register native Android/iOS tokens through `registerNativeDevice`; authenticated RLS limits each member to their own rows. Re-register on sign-in/token refresh; invoke `removeNativeDevice` before sign-out and unregister locally in the native host. Do not log tokens.
- Future sender must re-read call/message rows under authenticated RLS, derive recipient from stored rows, reject stale/ended calls, and deduplicate sends. Never accept a recipient/token supplied by a caller. Delete stale UNREGISTERED tokens; back off on 429/5xx.
- `callFcmData` defines string-only call payload data with a 40-second expiry. It is a contract, not an active sender. BIXGO dispatch must use approved-driver scope and canonical booking dispatch; no broadcast of passenger data.

## Android host (external work required)
Register an Android app in the same Firebase project and place google-services.json in the external Android project. Implement an FCM data receiver, notification channels, Telecom/Core-Telecom integration where applicable, foreground call service and full-screen incoming-call notification subject to Android permission/Play policies. Check expiry and re-fetch the authenticated call before acknowledging or answering. A push API acceptance is not device ringing; retain bix_call_ring acknowledgement. Respect notification denial, DND, OEM battery rules and force-stop. No promise of sub-second delivery.

## GPS contract
Optional Capacitor plugin `BixBackgroundLocation` exposes addWatcher({tripIds, backgroundTitle, backgroundMessage}, callback) and removeWatcher({id}). Merely detecting a plugin never proves background uploads work.
The native host must implement foreground location service, visible persistent notification, permission flows (including Android background location where required), authenticated uploads, network recovery and stop on sign-out/offline/trip completion. Call the existing assigned-driver-only location gate; do not widen RLS or accept client role claims. Web callbacks reuse updateBixgoLocation while awake. Native uploads must continue independently of suspended JavaScript. Do not store credentials in payloads or this repository.

## Device acceptance tests
Two real devices: grant/deny notifications, incoming voice/video while locked, expiry/decline/answer, token rotation, account switching/removal, app process killed/force-stopped, DND/battery restrictions. Driver: grant/deny GPS, active assigned trip with screen locked, stale-map indication, disconnect/reconnect and verify no updates after trip completion/sign-out. A powered-off phone cannot receive calls or GPS updates.