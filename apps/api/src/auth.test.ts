import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { authenticate } from "./auth";
import type { Env } from "./env";

const env = {
  SUPABASE_URL: "https://supabase.example.com",
  SUPABASE_JWT_ISSUER: "supabase-demo",
  SUPABASE_JWT_SECRET: "a-test-secret-long-enough-for-hs256",
} as Env;

async function token(secret = env.SUPABASE_JWT_SECRET!) {
  return new SignJWT({ email: "admin@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("11111111-1111-1111-1111-111111111111")
    .setIssuer(env.SUPABASE_JWT_ISSUER)
    .setAudience("authenticated")
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

describe("authenticate", () => {
  it("validates legacy self-hosted Supabase HS256 tokens", async () => {
    const request = new Request("https://api.example.com/v1/usage", {
      headers: { authorization: `Bearer ${await token()}` },
    });

    await expect(authenticate(request, env)).resolves.toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
    });
  });

  it("rejects tokens signed with another secret", async () => {
    const request = new Request("https://api.example.com/v1/usage", {
      headers: { authorization: `Bearer ${await token("wrong-secret")}` },
    });

    await expect(authenticate(request, env)).rejects.toThrow();
  });
});
