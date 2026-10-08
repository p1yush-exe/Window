# Window

Swipe-based shopping that connects buyers directly with local sellers.
UCS503P course project, Thapar Institute of Engineering and Technology.

- **App code**: [`code/`](code) (Vite + React + Capacitor + Firebase). See [docs/setup.md](docs/setup.md).
- **Docs**: [`docs/`](docs), built with mkdocs and published on every push to `main`.
- **Reports**: `project-proposal/`, `project-report-prototype-stage/`, `project-report-final/`.
- **Journals**: one folder per team member under `journals/`.

## Quick start

```shell
cd code
pnpm install
pnpm emulators      # local Firebase (Auth + Firestore)
pnpm seed:emu       # demo sellers and products
pnpm dev:emu        # http://localhost:5173
```

Demo password for all seeded accounts: `window123`.
