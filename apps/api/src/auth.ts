import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "./env";

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export async function authenticate(request: Request, env: Env): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("missing_token");
  const token = authorization.slice("Bearer ".length);
  const jwksUrl = `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
  let jwks = jwksByUrl.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksByUrl.set(jwksUrl, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: "authenticated",
  });
  if (!payload.sub) throw new Error("missing_subject");
  return {
    id: payload.sub,
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
  };
}
