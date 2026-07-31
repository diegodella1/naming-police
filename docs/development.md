# Development and release

## Local requirements

- Node 22 and pnpm 10.
- Current stable Rust.
- Tauri 2 OS dependencies.
- `tesseract` with `spa` and `eng` language data.
- `pdftoppm` for OCR of scanned PDF files.

Production bundles must include signed builds of Tesseract, language data and
Poppler utilities as Tauri resources, or replace the command adapter with native
Vision/Windows OCR. Missing OCR is reported as local extraction degradation and
never causes an original PDF to be uploaded.

## Verify

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Hosted beta

1. Create Supabase project and configure email template with `{{ .Token }}`.
2. Apply `apps/api/supabase/migrations/0001_initial.sql`.
3. Set Worker secrets:
   `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_ISSUER`.
4. Set public Worker vars in `wrangler.toml`.
5. Deploy with `pnpm --filter @naming-police/api exec wrangler deploy`.
6. Build desktop with `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `HOSTED_API_URL` and matching `VITE_*` variables.

Worker never logs request bodies. Review Cloudflare invocation logging before
production to confirm authorization headers and bodies are not exported.

## Public website

The static React site lives in `apps/web`. Cloudflare serves it through a Worker
with SPA fallback, security headers and a custom domain:

```bash
pnpm --filter @naming-police/web build
pnpm --filter @naming-police/web exec wrangler deploy --dry-run
pnpm --filter @naming-police/web run deploy
```

Wrangler must be authenticated before production deploy. The production route
is `renamer.diegodella.ar`.

## Signing

Release workflow expects:

- Tauri updater signing key/password.
- Apple Developer ID certificate, App Store Connect app password and team ID.
- Windows code-signing certificate configured on runner.

Replace updater public key and release repository endpoint in
`src-tauri/tauri.conf.json` before first signed build. Keep release draft until
macOS notarization, Windows signature and updater signatures are verified on
clean machines.

## Release acceptance

- Install on clean current macOS and Windows VMs.
- Add Downloads folder and process image, text PDF and scanned PDF.
- Verify Hosted, BYOK and local-only modes.
- Simulate slow copy, duplicate watcher events, collision, app kill between
  filesystem and DB commit, external edit and undo.
- Inspect SQLite, application logs, Worker logs and analytics for content,
  paths, thumbnails, OCR text and secrets.
- Update from previous signed release while queue is idle.
