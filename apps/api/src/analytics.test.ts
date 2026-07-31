import { afterEach, describe, expect, it, vi } from "vitest";

import { getAdminMetrics, recordApiRequest, recordDownload } from "./analytics";
import type { Env } from "./env";

const env = {
  SUPABASE_URL: "https://supabase.example.com",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
} as Env;

afterEach(() => vi.unstubAllGlobals());

describe("analytics", () => {
  it("records download starts without personal data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await recordDownload(env, "windows", "0.1.0");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.example.com/rest/v1/download_events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ platform: "windows", version: "0.1.0", source: "website" }),
      }),
    );
  });

  it("records operational API metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await recordApiRequest(env, {
      userId: "user-1",
      route: "/v1/analyze",
      method: "POST",
      status: 200,
      durationMs: 41,
      requestId: "request-1",
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      user_id: "user-1",
      route: "/v1/analyze",
      method: "POST",
      status: 200,
      duration_ms: 41,
      request_id: "request-1",
    });
  });

  it("requests the aggregate admin report for the selected period", async () => {
    const metrics = { downloads: { total: 0 }, recent_errors: [] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(metrics));
    vi.stubGlobal("fetch", fetchMock);
    const since = new Date("2026-07-01T00:00:00.000Z");

    await expect(getAdminMetrics(env, since)).resolves.toEqual(metrics);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      p_since: "2026-07-01T00:00:00.000Z",
    });
  });
});
