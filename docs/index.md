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

The app opens on a chooser: **I'm shopping** or **I'm a seller**. One account can do both; the top-right switch flips between the two layouts.

| Role | Flow |
|---|---|
| Shopper | Picks an area and up to 3 interests, then swipes product cards: tap flips a card to its back (cost range, full description, whether it costs a swipe or a super swipe). Dragging left shows a red edge, dragging right a green edge and an "Upgrade to super swipe?" prompt. A right swipe costs 1 swipe and is a *like* the seller must accept; a super swipe claims the product instantly (with a light-burst effect). 5 free swipes a day, 2 free super swipes on first app login; bundles can be bought (simulated). When swipes run out, the counter grows and an overlay offers super swipes, bundles or, on the web, the app. Bottom-left bag holds likes and chats; bottom-right profile holds name, username, contact, email and balances. |
| Seller | Four-step shop setup (Google can fill owner details). Bottom-centre plus opens the camera (or gallery), compresses and crops the photo, then asks for up to 3 tags, name (an ID like WN-7F3K2Q is generated), a description of at most 150 words, a cost range with a dual slider, the shop (if several), payment modes and a super-swipes-only switch. Bottom-left shop management: shops, per-shop auto message, auto-matcher (99.99 per day), decorations and upload-token bundles (1 token = 10 uploads). Bottom-right profile: credentials, shops, payment ids. Home shows likes waiting for acceptance, products with stock switches, and chats. |

## Stack

| Layer | Choice |
|---|---|
| App | Vite + React 19 + TypeScript + Tailwind 4, one mobile-first codebase |
| Android | Capacitor 8 wrapping the same web build into an APK |
| Backend | Firebase Authentication + Cloud Firestore, all logic in the client under security rules |
| Images | Cloudinary unsigned uploads, compressed on the device, native camera/gallery picker on Android |
| Sign-in | Google (web popup, native on Android) or email/password; phone/email OTP simulated with `0000` |
| Theme | Light storybook design: white canvas, Nunito display type, one green, blue links, 12px radius, 2px borders. A storefront intro with sliding doors opens the app. |
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
