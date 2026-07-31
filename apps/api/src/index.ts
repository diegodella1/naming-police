import { authenticate } from "./auth";
import { analyzeWithOpenAI } from "./analysis";
import type { Env } from "./env";
import { apiError, corsHeaders, json, withCors } from "./http";
import { finalizeQuota, getUsage, reserveQuota } from "./quota";

function requestOrigin(request: Request, env: Env): string {
  const origin = request.headers.get("origin");
  const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((value) => value.trim());
  return origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = requestOrigin(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
    const url = new URL(request.url);
    if (url.pathname === "/v1/health") return withCors(json({ status: "ok" }), origin);
    let user;
    try {
      user = await authenticate(request, env);
    } catch {
      return withCors(apiError(401, "unauthorized", "Authentication required"), origin);
    }
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
    } else {
      response = apiError(404, "validation", "Route not found");
    }
    console.log(
      JSON.stringify({
        request_id: crypto.randomUUID(),
        route: url.pathname,
        method: request.method,
        status: response.status,
      }),
    );
    return withCors(response, origin);
  },
} satisfies ExportedHandler<Env>;
