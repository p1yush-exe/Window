# Architecture

One React single-page app is served by Vercel as the website and wrapped
by Capacitor as the Android app. There is no custom server: the client
talks to Firebase Authentication and Cloud Firestore directly, and
Firestore security rules enforce who may read and write what.

```
 ┌──────────────┐      ┌───────────────┐
 │  Web (Vercel)│      │ Android (APK) │   same dist/ bundle
 └──────┬───────┘      └───────┬───────┘
        │   firebase JS SDK    │
        ▼                      ▼
 ┌───────────────────────────────────────┐
 │ Firebase Auth  ·  Cloud Firestore     │  rules in code/firestore.rules
 └───────────────────────────────────────┘
        ▲
        │ unsigned upload (images only)
 ┌──────┴───────┐
 │  Cloudinary  │
 └──────────────┘
```

## Guest shoppers and the first right swipe

The feed is readable without an account (products are public under the
rules). A guest's left swipes only remove the card from memory. A right
swipe by a guest opens the login sheet; the card is held until the
shopper signs up or logs in, then the swipe and match are written as
usual. Sellers always have accounts, created at the end of the setup
wizard with the owner's verified email and a password.

Phone and email OTP verification is simulated for now: `0000` is accepted
and the vendor document records `phoneVerified` / `emailVerified`. Store
location uses the browser or Capacitor geolocation API and OpenStreetMap
tiles via Leaflet, with Nominatim for reverse geocoding; no API key.

## Data model

```
users/{uid}                      role, displayName, avatarUrl
users/{uid}/swipes/{productId}   direction, clientTs, createdAt
users/{uid}/notifications/{id}   type, matchId, productId, title, body, read, createdAt, sentAt
vendors/{uid}                    ownerUid, name, description, tags[≤3], website, storefrontUrl,
                                 location{lat,lng,address}, ownerName, ownerPhone, ownerEmail,
                                 phoneVerified, emailVerified, verified (immutable by the owner)
products/{id}                    vendorId, vendorName, title, description, price|null, currency,
                                 category, imageUrls[], availability, createdAt, updatedAt
matches/{buyerUid_productId}     buyerUid, vendorId, productId, denormalised names/image,
                                 productAvailability, createdAt, swipeClientTs,
                                 lastMessageAt, lastMessageText, unread{uid: n}
matches/{id}/messages/{id}       senderUid, body, clientTs, createdAt
reviews/{buyerUid_productId}     buyerUid, vendorId, productId, rating, body, createdAt
```

## Mechanics without Cloud Functions

- **Feed**: products with availability in `[in_stock, low]`, newest first,
  paginated 20 at a time. The buyer's swipe ids are loaded once and
  filtered out on the client.
- **Match**: a right swipe is one batched write of the swipe document and
  the match document. The match id is deterministic
  (`buyerUid_productId`) so repeated swipes are idempotent, and the rules
  verify that the vendor on the match is the product's real vendor.
- **Chat**: `onSnapshot` on the messages subcollection. Sending is a batch
  of the message plus the match's last-message fields and an unread
  counter for the other party. Rules allow only the two participants.
- **Availability**: the seller updates the product, then the seller's
  client queries its matches for that product and batch-writes a
  notification into each buyer's `notifications` subcollection and
  updates `productAvailability` on each match. Rules let a vendor create
  an availability notification for a buyer only when such a match exists.
  Buyers' Liked tab, chat header and Alerts update live.
- **Reviews**: one per buyer per product (deterministic id). Rules require
  an existing match. Averages are computed on the client from a query.
- **Metrics**: client timestamps on swipes and messages are compared with
  arrival time on the other device; stored in `localStorage` and shown on
  `/metrics`.

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push / PR touching `code/` | oxlint, tsc, vitest, Firestore rules tests on the emulator, production build |
| `android.yml` | push to `main`, `v*` tags, manual | web build → `cap sync` → `gradlew assembleDebug` → APK artifact / release asset |
| `firebase.yml` | rules or indexes change on `main` | `firebase deploy --only firestore` with a service account |
| `mkdocs.yml` | push to `main` | builds and publishes these docs |
| Vercel Git integration | every push | preview per PR, production on `main` |
