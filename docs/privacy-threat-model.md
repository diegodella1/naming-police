# Privacy and filesystem threat model

## Trust boundaries

- React UI receives opaque IDs and display-safe local data.
- Rust owns filesystem, SQLite, hashing, secrets and provider calls.
- Cloudflare Worker receives reduced thumbnail or extracted text only for
  Hosted AI.
- OpenAI is an external subprocesser in Hosted and BYOK modes.

## Enforced controls

- Canonical paths restricted to explicitly watched folders.
- Symlinks, network locations, system folders, repositories, app bundles and
  known managed creative libraries rejected.
- AI schema cannot contain paths or actions; model receives no tools.
- Filenames built and sanitized locally.
- Rename uses an exclusive hard-link-and-unlink operation and a two-phase
  journal. Existing destinations are never overwritten.
- Undo verifies content hash and destination availability.
- API keys and session tokens use OS credential storage, never SQLite.
- Backend validates JWT, size, quota and schema before provider call.
- Operational logging contains route, random request ID, status, latency and
  usage only.

## Known platform gates

- HEIC requires platform decoder integration; unsupported codec produces a
  visible error.
- OCR binaries and language packs must be bundled and signed for production.
- Code-signing identities and updater public key are release secrets supplied
  outside source control.
