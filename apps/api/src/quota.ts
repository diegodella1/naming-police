import type { UsageSnapshot } from "@naming-police/contracts";
import type { Env } from "./env";

async function rpc<T>(
  env: Env,
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`quota_rpc_${response.status}`);
  return (await response.json()) as T;
}

export async function reserveQuota(
  env: Env,
  userId: string,
  requestId: string,
): Promise<{ reservation_id: string; snapshot: UsageSnapshot }> {
  return rpc(env, "reserve_analysis_quota", {
    p_user_id: userId,
    p_request_id: requestId,
    p_monthly_limit: Number(env.MONTHLY_QUOTA),
  });
}

export async function finalizeQuota(
  env: Env,
  reservationId: string,
  success: boolean,
  inputTokens = 0,
  outputTokens = 0,
): Promise<void> {
  await rpc(env, "finalize_analysis_quota", {
    p_reservation_id: reservationId,
    p_success: success,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });
}

export async function getUsage(env: Env, userId: string): Promise<UsageSnapshot> {
  return rpc(env, "get_analysis_usage", {
    p_user_id: userId,
    p_monthly_limit: Number(env.MONTHLY_QUOTA),
  });
}
