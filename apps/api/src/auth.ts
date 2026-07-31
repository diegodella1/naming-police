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
  const verificationKey = env.SUPABASE_JWT_SECRET
    ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
    : remoteJwks(env);
  const { payload } = await jwtVerify(token, verificationKey, {
    ...(!env.SUPABASE_JWT_SECRET ? { issuer: env.SUPABASE_JWT_ISSUER } : {}),
    audience: "authenticated",
    ...(env.SUPABASE_JWT_SECRET ? { algorithms: ["HS256"] } : {}),
  });
  if (!payload.sub) throw new Error("missing_subject");
  if (payload.iss && payload.iss !== env.SUPABASE_JWT_ISSUER) throw new Error("invalid_issuer");
  return {
    id: payload.sub,
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
  };
}

function remoteJwks(env: Env): ReturnType<typeof createRemoteJWKSet> {
  const jwksUrl = `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
  let jwks = jwksByUrl.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksByUrl.set(jwksUrl, jwks);
  }
  return jwks;
}
