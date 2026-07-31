# Desktop beta releases

## Delivery

- Website: `https://renamer.diegodella.ar/download`
- Public artifacts: `https://downloads.renamer.diegodella.ar`
- Updater manifest: `/latest.json`
- Website manifest: `/release.json`
- Storage bucket: `naming-police-releases`
- Hosted API: `https://api.renamer.diegodella.ar`

Versioned assets are uploaded before either manifest. `latest.json` and
`release.json` are uploaded last, so users never see a partially published
release. Re-running a release is safe because versioned objects are immutable
by URL and manifests activate only after every upload succeeds.

## Required GitHub Actions secrets

Desktop release:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `CLOUDFLARE_API_TOKEN` with R2 object write access
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `HOSTED_API_URL`

Hosted API:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWT_SECRET` for legacy self-hosted HS256 projects
- `CLOUDFLARE_API_TOKEN` with Workers Scripts and Routes write access
- `CLOUDFLARE_ACCOUNT_ID`

Never commit these values. The updater public key is intentionally committed in
`tauri.conf.json`; its private key remains outside the repository.

## Publish

1. Merge validated changes to `main`.
2. Set the application version in `apps/desktop/src-tauri/tauri.conf.json`.
3. Push a matching tag, for example `v0.1.0`.
4. Wait for `CI / publish-release`.
5. Test the DMG and EXE from the public download page on clean machines.
6. Publish the private GitHub draft release only if GitHub access is desired;
   public downloads do not depend on that release being public.

## Unsigned beta warning

The beta has no Apple Developer ID notarization or Microsoft Authenticode
certificate. macOS Gatekeeper and Windows SmartScreen can warn during install.
The Tauri updater signature is separate and mandatory: never rotate its key
without shipping a trusted transition in an older app version.

## Rollback

Upload the previous known-good `latest.json` and `release.json` to the bucket
root. Versioned installers remain available under `/releases/vX.Y.Z/`.
