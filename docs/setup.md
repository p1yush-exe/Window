# Setup

Everything lives in `code/`. You need Node 22, pnpm 11 and, for the
emulator and the Android build, a JDK (17 or newer).

## 1. Install

```shell
cd code
pnpm install
```

## 2. Run against the local Firebase emulator (no account needed)

```shell
pnpm emulators        # terminal 1: Auth + Firestore emulators, UI on http://localhost:4000
pnpm seed:emu         # terminal 2: demo sellers, 60 products and a demo buyer
pnpm dev:emu          # terminal 2: app on http://localhost:5173
```

Demo accounts (password `window123`): `buyer@window.demo`,
`threads@window.demo`, `kicks@window.demo`, `canvas@window.demo`,
`fresh@window.demo`.

## 3. Run against the hosted Firebase project

Copy `.env.example` to `.env` and fill in the Firebase web app config and
the Cloudinary cloud name and unsigned upload preset. Then:

```shell
pnpm exec firebase login
pnpm exec firebase use <project-id>
pnpm exec firebase deploy --only firestore     # rules + indexes
pnpm seed                                      # optional demo data
pnpm dev
```

## 4. Checks

```shell
pnpm lint
pnpm typecheck
pnpm test          # unit tests
pnpm test:rules    # Firestore security rules on the emulator
pnpm build
```

## 5. Android APK

The `android` workflow builds a debug APK on every push to `main` and
attaches it to the GitHub Actions run (and to the release on a `v*` tag).

Locally, with the Android SDK installed:

```shell
pnpm cap:sync                       # build web + copy into android/
cd android && ./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 6. Deploy the website

The repo is linked to the Vercel project `window` (root directory
`code/`), live at <https://window-beige.vercel.app>. Every push to `main`
deploys production; pull requests get preview URLs. The `VITE_*`
variables from `.env.example` are set in the Vercel project settings.

Firebase project: `window-56674` (Firestore in `asia-south1`, Email/Password
and Google sign-in enabled).
