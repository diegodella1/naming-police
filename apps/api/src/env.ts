export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_ISSUER: string;
  SUPABASE_JWT_SECRET?: string;
  MONTHLY_QUOTA: string;
  MAX_PAYLOAD_BYTES: string;
  ALLOWED_ORIGIN: string;
  NOMINATIM_BASE_URL: string;
}
