import type { Env } from "./env";

export type Platform = "macos" | "windows";

export interface AdminMetrics {
  since: string;
  downloads: { total: number; macos: number; windows: number };
  api: {
    total: number;
    successful: number;
    errors: number;
    unique_users: number;
    p50_ms: number;
    p95_ms: number;
  };
  usage: { analyses: number; input_tokens: number; output_tokens: number };
  daily: Array<{ date: string; downloads: number; api_requests: number; api_errors: number }>;
  recent_errors: Array<{
    occurred_at: string;
    route: string;
    status: number;
    duration_ms: number;
    request_id: string;
  }>;
}

function serviceHeaders(env: Env): HeadersInit {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
}

async function insert(env: Env, table: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...serviceHeaders(env), prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`analytics_insert_${table}_${response.status}`);
}

export function recordDownload(
  env: Env,
  platform: Platform,
  version: string,
): Promise<void> {
  return insert(env, "download_events", { platform, version, source: "website" });
}

export function recordApiRequest(
  env: Env,
  event: {
    userId: string;
    route: string;
    method: string;
    status: number;
    durationMs: number;
    requestId: string;
  },
): Promise<void> {
  return insert(env, "api_request_events", {
    user_id: event.userId,
    route: event.route,
    method: event.method,
    status: event.status,
    duration_ms: event.durationMs,
    request_id: event.requestId,
  });
}

export async function getAdminMetrics(
  env: Env,
  since: Date,
): Promise<AdminMetrics> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_naming_police_admin_metrics`, {
    method: "POST",
    headers: serviceHeaders(env),
    body: JSON.stringify({ p_since: since.toISOString() }),
  });
  if (!response.ok) throw new Error(`admin_metrics_${response.status}`);
  return (await response.json()) as AdminMetrics;
}
