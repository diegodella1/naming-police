import { authenticate } from "./auth";
import { analyzeWithOpenAI } from "./analysis";
import {
  getAdminMetrics,
  recordApiRequest,
  recordDownload,
  type Platform,
} from "./analytics";
import type { Env } from "./env";
import { apiError, corsHeaders, json, withCors } from "./http";
import { finalizeQuota, getUsage, reserveQuota } from "./quota";

function requestOrigin(request: Request, env: Env): string {
  const origin = request.headers.get("origin");
  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((value) => value.trim());
  return origin && allowedOrigins.includes(origin)
    ? origin
    : (allowedOrigins[0] ?? "tauri://localhost");
}

function adminEmails(env: Env): string[] {
  return env.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase());
}

function isAdmin(env: Env, email?: string): boolean {
  return Boolean(email && adminEmails(env).includes(email.toLowerCase()));
}

async function bodyEmail(request: Request): Promise<{ email: string; token?: string }> {
  const body = (await request.json()) as { email?: unknown; token?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254) throw new Error("invalid_email");
  return {
    email,
    ...(typeof body.token === "string" ? { token: body.token.trim() } : {}),
  };
}

async function requestAdminOtp(request: Request, env: Env): Promise<Response> {
  let email: string;
  try {
    ({ email } = await bodyEmail(request));
  } catch {
    return apiError(400, "validation", "Invalid email");
  }
  if (!isAdmin(env, email)) return apiError(403, "unauthorized", "Admin access required");
  const redirectTo = "https://renamer.diegodella.ar/admin";
  const upstream = await fetch(`${env.SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!upstream.ok) return apiError(503, "internal", "Unable to send access code", true);
  return json({ sent: true });
}

async function verifyAdminOtp(request: Request, env: Env): Promise<Response> {
  let credentials: { email: string; token?: string };
  try {
    credentials = await bodyEmail(request);
  } catch {
    return apiError(400, "validation", "Invalid credentials");
  }
  if (!isAdmin(env, credentials.email) || !/^\d{6,8}$/.test(credentials.token ?? "")) {
    return apiError(403, "unauthorized", "Admin access required");
  }
  const upstream = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      email: credentials.email,
      token: credentials.token,
      type: "email",
    }),
  });
  if (!upstream.ok) return apiError(401, "unauthorized", "Invalid or expired code");
  const session = (await upstream.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  });
}

async function download(
  env: Env,
  platform: Platform,
  context: ExecutionContext,
): Promise<Response> {
  const manifestResponse = await fetch(env.DOWNLOAD_MANIFEST_URL, { cf: { cacheTtl: 60 } });
  if (!manifestResponse.ok) return apiError(503, "internal", "Release unavailable", true);
  const manifest = (await manifestResponse.json()) as {
    version?: unknown;
    platforms?: Partial<Record<Platform, { url?: unknown }>>;
  };
  const version = typeof manifest.version === "string" ? manifest.version : "";
  const target = manifest.platforms?.[platform]?.url;
  if (!version || typeof target !== "string" || !target.startsWith("https://downloads.renamer.diegodella.ar/")) {
    return apiError(503, "internal", "Release manifest invalid", true);
  }
  context.waitUntil(recordDownload(env, platform, version).catch(console.error));
  return new Response(null, {
    status: 302,
    headers: { location: target, "cache-control": "no-store" },
  });
}

function metricsSince(url: URL): Date {
  const milliseconds =
    url.searchParams.get("range") === "24h"
      ? 24 * 60 * 60 * 1000
      : url.searchParams.get("range") === "30d"
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - milliseconds);
}

async function analyze(request: Request, env: Env, userId: string): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > Number(env.MAX_PAYLOAD_BYTES)) {
    return apiError(413, "validation", "Payload too large");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > Number(env.MAX_PAYLOAD_BYTES)) {
    return apiError(413, "validation", "Payload too large");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return apiError(400, "validation", "Invalid JSON");
  }
  const requestId =
    body && typeof body === "object" && "request_id" in body
      ? String((body as { request_id: unknown }).request_id)
      : request.headers.get("idempotency-key") ?? "";
  let reservation: Awaited<ReturnType<typeof reserveQuota>>;
  try {
    reservation = await reserveQuota(env, userId, requestId);
  } catch (error) {
    if (String(error).includes("quota_exceeded")) {
      return apiError(402, "quota_exceeded", "Monthly hosted analysis quota exhausted");
    }
    return apiError(503, "internal", "Unable to reserve quota", true);
  }
  try {
    const result = await analyzeWithOpenAI(env, body);
    await finalizeQuota(
      env,
      reservation.reservation_id,
      true,
      result.usage.input_tokens,
      result.usage.output_tokens,
    );
    return json({ result, usage: { ...reservation.snapshot, used: reservation.snapshot.used + 1 } });
  } catch (error) {
    await finalizeQuota(env, reservation.reservation_id, false).catch(() => undefined);
    const message = String(error);
    if (message.includes("invalid_") || message.includes("exactly_") || message.includes("too_large")) {
      return apiError(400, "validation", "Analysis payload is invalid");
    }
    if (message.includes("provider_429")) {
      return apiError(429, "rate_limited", "AI provider rate limited the request", true);
    }
    return apiError(502, "provider_error", "AI provider could not analyze this file", true);
  }
}

async function geocode(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return apiError(400, "validation", "Invalid coordinates");
  }
  const roundedLat = lat.toFixed(3);
  const roundedLon = lon.toFixed(3);
  const upstream = await fetch(
    `${env.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLon}&zoom=12`,
    {
      headers: {
        "user-agent": "NamingPolice/0.1 (privacy-preserving reverse geocoder)",
        accept: "application/json",
      },
      cf: { cacheTtl: 86_400, cacheEverything: true },
    },
  );
  if (!upstream.ok) return apiError(502, "provider_error", "Geocoder unavailable", true);
  const data = (await upstream.json()) as {
    address?: { city?: string; town?: string; village?: string; country_code?: string };
  };
  return json({
    locality: data.address?.city ?? data.address?.town ?? data.address?.village ?? null,
    country_code: data.address?.country_code ?? null,
  });
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const origin = requestOrigin(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
    const url = new URL(request.url);
    if (url.pathname === "/v1/health") return withCors(json({ status: "ok" }), origin);
    if (url.pathname === "/v1/auth/otp" && request.method === "POST") {
      return withCors(await requestAdminOtp(request, env), origin);
    }
    if (url.pathname === "/v1/auth/verify" && request.method === "POST") {
      return withCors(await verifyAdminOtp(request, env), origin);
    }
    const downloadPlatform = url.pathname.match(/^\/v1\/download\/(macos|windows)$/)?.[1] as
      | Platform
      | undefined;
    if (downloadPlatform && request.method === "GET") {
      return download(env, downloadPlatform, context);
    }
    let user;
    try {
      user = await authenticate(request, env);
    } catch {
      return withCors(apiError(401, "unauthorized", "Authentication required"), origin);
    }
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    let response: Response;
    if (url.pathname === "/v1/analyze" && request.method === "POST") {
      response = await analyze(request, env, user.id);
    } else if (url.pathname === "/v1/usage" && request.method === "GET") {
      try {
        response = json(await getUsage(env, user.id));
      } catch {
        response = apiError(503, "internal", "Usage unavailable", true);
      }
    } else if (url.pathname === "/v1/geocode" && request.method === "GET") {
      response = await geocode(request, env);
    } else if (url.pathname === "/v1/admin/metrics" && request.method === "GET") {
      if (!isAdmin(env, user.email)) {
        response = apiError(403, "unauthorized", "Admin access required");
      } else {
        try {
          response = json(await getAdminMetrics(env, metricsSince(url)));
        } catch {
          response = apiError(503, "internal", "Metrics unavailable", true);
        }
      }
    } else {
      response = apiError(404, "validation", "Route not found");
    }
    if (!url.pathname.startsWith("/v1/admin/")) {
      context.waitUntil(
        recordApiRequest(env, {
          userId: user.id,
          route: url.pathname,
          method: request.method,
          status: response.status,
          durationMs: Date.now() - startedAt,
          requestId,
        }).catch(console.error),
      );
    }
    console.log(
      JSON.stringify({
        request_id: requestId,
        route: url.pathname,
        method: request.method,
        status: response.status,
      }),
    );
    return withCors(response, origin);
  },
} satisfies ExportedHandler<Env>;
