![Tiet Logo](assets/tiet-logo.svg){ .tiet-logo }

**UCS503: Software Engineering (Project)**  
**TIET Patiala**

# Window: swipe-based shopping

**Team**: Piyush Malik (1024030167), Paarth Singh (1024030160), Bhuvik Garg (1024030550), CSED.  
**Lab instructor**: Miss Paramveer Kaur.

Window is a mobile-first shopping app, available as a website and as an
Android app, where buyers discover products one card at a time. A right
swipe opens a chat with the seller, sellers push live stock updates to
everyone who liked a product, and buyers leave reviews after talking to
the seller. Prices are optional so that the conversation, not the
catalogue, closes the sale.

**Live**: website at <https://window-beige.vercel.app> · Android APK on the
[releases page](https://github.com/p1yush-exe/Window/releases/latest).
Demo accounts (password `window123`): `buyer@window.demo`, `threads@window.demo`.

## What it does

| Role | Features |
|---|---|
| Buyer | Sign up, swipe feed (drag, buttons or arrow keys), liked list with live stock, chat per match, stock alerts, reviews, store and product pages |
| Seller | Store profile, product listing with optional price and photos, availability switch that notifies interested buyers instantly, inbox grouped by product |

## Stack

| Layer | Choice |
|---|---|
| App | Vite + React 19 + TypeScript + Tailwind 4, one mobile-first codebase |
| Android | Capacitor 8 wrapping the same web build into an APK |
| Backend | Firebase Authentication + Cloud Firestore, all logic in the client under security rules |
| Images | Cloudinary unsigned uploads, compressed on the device, native camera/gallery picker on Android |
| Sign-in | Google (web popup, native on Android) or email/password; phone/email OTP simulated with `0000` |
| Theme | INVERSA design system: dark canvas by default, light variant, toggle in Profile |
| Hosting | Vercel (web), GitHub Actions artifact (APK) |
| CI | GitHub Actions: lint, typecheck, unit tests, Firestore rules tests on the emulator, APK build, rules deploy, docs deploy |

See [Setup](setup.md) to run it and [Architecture](architecture.md) for the data model and the real-time mechanics.

## Evaluation metrics

The proposal defines three measurable targets. The app records them on the
device and shows them on the hidden `/metrics` page (Profile → Evaluation metrics).

| Metric | Target | How it is measured |
|---|---|---|
| Swipe → match latency (primary) | median ≤ 2 s | right swipe until the batched write is acknowledged by Firestore |
| Message delivery | ≤ 1 s | sender's clock to arrival on the receiving device |
| Availability sync | seconds | seller changes stock → alert arrives on the buyer's device |
