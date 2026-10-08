# Week 1 : From Tauri desktop to web + Android in one codebase

## Problem

The proposal described Window as a Tauri desktop app. The actual
requirement is a phone app plus a full-featured website, with the website
on Vercel and an installable APK, on a one-night deadline.

## Options considered

| Option | Why not |
|---|---|
| Expo (React Native) + Expo web | Two render targets to polish; APK needs EAS cloud or a local Android SDK |
| Next.js + Capacitor | Static export friction for no gain, since Firestore is called from the client |
| **Vite SPA + Capacitor** | One build feeds both Vercel and the APK; GitHub's Ubuntu runner has the Android SDK so the APK is built in CI |

## Backend

Firestore was chosen for onboarding both vendors and buyers quickly.
Two things had to be designed around:

1. New Firebase projects need the Blaze plan for Storage, so product
   images go to Cloudinary through an unsigned upload preset.
2. No Cloud Functions on the free plan, so fan-out (stock change →
   notify every interested buyer) is done by the seller's client in a
   batched write, and a security rule only allows that write when a match
   between that seller and that buyer exists.

## Outcome

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:rules` and
`pnpm build` all pass; three GitHub Actions workflows cover CI, the APK
and rules deployment.
