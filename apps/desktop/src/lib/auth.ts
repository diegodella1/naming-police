const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function configuration(): { url: string; anonKey: string } {
  if (!url || !anonKey) throw new Error("Supabase no está configurado en este build");
  return { url, anonKey };
}

export async function requestEmailOtp(email: string): Promise<void> {
  const config = configuration();
  const response = await fetch(`${config.url}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: config.anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!response.ok) throw new Error("No se pudo enviar el código");
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const config = configuration();
  const response = await fetch(`${config.url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: config.anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, token, type: "email" }),
  });
  if (!response.ok) throw new Error("Código inválido o vencido");
  const body = (await response.json()) as { access_token: string; refresh_token: string };
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}
