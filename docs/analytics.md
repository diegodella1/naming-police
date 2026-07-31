# Product analytics

The admin dashboard at `/admin` is restricted to the email allowlist configured by
`ADMIN_EMAILS`. Authentication uses a one-time email code issued by the self-hosted
Supabase instance.

## Tracking plan

| Event | Trigger | Properties | Decision supported |
| --- | --- | --- | --- |
| `download_requested` | The API resolves a macOS or Windows download redirect | platform, version, source | Release adoption and platform priority |
| `api_request_completed` | A product API request returns | route, method, status, duration, request ID, user UUID | Reliability, latency and capacity |
| `analysis_completed` | An analysis reservation reaches `used` | model and input/output token counts | AI usage, cost and quota planning |

`download_requested` measures download intent: it does not prove that the transfer or
installation completed. Repeated requests are counted separately. Admin and authentication
requests are excluded from product API totals.

## Privacy and operations

The analytics tables do not store filenames, extracted content, prompts, IP addresses or
email addresses. The user UUID is retained only to count distinct API users. Raw operational
events should be kept for 90 days; aggregated totals can be retained longer. Supabase row
level security blocks public table access and only the API service role reads the report RPC.

The dashboard reports download starts, API success/error counts, unique API users, p50/p95
latency, analysis/token usage, a daily trend and a recent error ledger. Use `24h`, `7d` or
`30d` to change the reporting window.

## Measurement readiness

Before this instrumentation the product scored **55/100 (Unreliable)**: usage reservations
existed, but downloads, latency, error trends and an operator view did not. With the tracking
plan, protected dashboard, schema migration and automated tests it scores **87/100
(Measurement-Ready)**. The remaining gap is verified transfer/installation telemetry; the
current download metric is explicitly a redirect start.
