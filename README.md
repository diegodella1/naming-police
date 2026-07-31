# Naming Police

Local-first desktop utility that watches selected folders and proposes safe,
descriptive filenames for images and PDFs.

## Workspace

- `apps/desktop`: Tauri 2 + React desktop application and Rust local core.
- `apps/api`: Cloudflare Worker for hosted AI, quota and reverse geocoding.
- `apps/web`: Public product site deployed to `renamer.diegodella.ar`.
- `packages/contracts`: versioned TypeScript contracts shared by both apps.

## Development

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm typecheck
pnpm test
pnpm dev
```

Public web:

```bash
pnpm --filter @naming-police/web dev
pnpm --filter @naming-police/web build
pnpm --filter @naming-police/web run deploy
```

Desktop environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_HOSTED_API_URL=http://localhost:8787
```

The Rust toolchain and Tauri system dependencies are required for `pnpm tauri
dev`. See [docs/development.md](docs/development.md).

## Releases

Tags named `vX.Y.Z` build macOS Apple Silicon and Windows x64 installers. The
workflow signs updater artifacts, creates a private draft GitHub release, and
publishes public installers plus manifests to Cloudflare R2. See
[docs/releases.md](docs/releases.md).
