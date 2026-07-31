import { Eye, KeyRound, LockKeyhole, Server, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppSettings } from "../types";

interface Props {
  settings: AppSettings;
  authenticated: boolean;
  used: number;
  limit: number;
  onProvider: (provider: AppSettings["provider"]) => Promise<void>;
  onSaveKey: (key: string) => Promise<void>;
  onDeleteKey: () => Promise<void>;
  onRequestCode: (email: string) => Promise<void>;
  onVerify: (email: string, code: string) => Promise<void>;
  onRetryStore: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function Privacy({
  settings,
  authenticated,
  used,
  limit,
  onProvider,
  onSaveKey,
  onDeleteKey,
  onRequestCode,
  onVerify,
  onRetryStore,
  onSignOut,
}: Props) {
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [storagePending, setStoragePending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string>();
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  const sendCode = async () => {
    await onRequestCode(email.trim().toLowerCase());
    setCode("");
    setOtpSent(true);
    setStoragePending(false);
    setCooldown(60);
  };
  return (
    <section>
      <header className="page-header">
        <div><p className="eyebrow">CONTROL DE EVIDENCIA</p><h1>Privacidad y uso</h1></div>
        <div className="privacy-seal"><ShieldCheck size={19} /> LOCAL-FIRST</div>
      </header>
      <div className="privacy-grid">
        <article className="settings-card wide">
          <h2>¿Cómo querés analizar?</h2>
          <div className="provider-options">
            {[
              { id: "hosted" as const, icon: Server, title: "Hosted AI", text: "Miniatura o texto mínimo vía Naming Police." },
              { id: "byok" as const, icon: KeyRound, title: "Tu API key", text: "Directo desde esta app hacia OpenAI." },
              { id: "local" as const, icon: WifiOff, title: "Solo local", text: "Metadata, EXIF, PDF y OCR. Sin transmisión." },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  className={settings.provider === option.id ? "provider-option selected" : "provider-option"}
                  onClick={() => void onProvider(option.id)}
                >
                  <Icon />
                  <strong>{option.title}</strong>
                  <span>{option.text}</span>
                  <i />
                </button>
              );
            })}
          </div>
        </article>
        <article className="settings-card">
          <h2><Server size={19} /> Cuenta Hosted</h2>
          {authenticated ? (
            <>
              <p className="success-line"><ShieldCheck size={16} /> Sesión protegida en almacén del sistema.</p>
              <div className="usage-large"><strong>{used}</strong><span>/ {limit} análisis este mes</span></div>
              <div className="usage-bar"><div style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }} /></div>
              <button className="ghost" onClick={() => void onSignOut()}>Cerrar sesión</button>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (authBusy) return;
                setAuthBusy(true);
                setAuthError(undefined);
                const action = storagePending
                  ? onRetryStore()
                  : otpSent
                    ? onVerify(email.trim().toLowerCase(), code.replace(/\D/g, ""))
                    : sendCode();
                void action
                  .catch((cause) => {
                    const message = cause instanceof Error ? cause.message : String(cause);
                    setAuthError(message);
                    if (otpSent && /segura|secret|credential|keyring|almacen/i.test(message)) {
                      setStoragePending(true);
                    }
                  })
                  .finally(() => setAuthBusy(false));
              }}
            >
              <p>Ingresá con código email. Sin contraseña ni navegador externo.</p>
              <input type="email" required disabled={otpSent || storagePending} placeholder="vos@ejemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              {otpSent && !storagePending ? <input required inputMode="numeric" pattern="[0-9]{6,8}" placeholder="Código de 6–8 dígitos" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} /> : null}
              {storagePending ? <p className="inline-error" role="status">Código validado. Falta guardar la sesión en Credential Manager.</p> : null}
              {authError ? <p className="inline-error" role="alert">{authError}</p> : null}
              <button className="primary" type="submit" disabled={authBusy}>
                {authBusy ? "Procesando…" : storagePending ? "Reintentar guardar sesión" : otpSent ? "Verificar código" : "Enviar código"}
              </button>
              {otpSent && !storagePending ? (
                <button className="ghost" type="button" disabled={authBusy || cooldown > 0} onClick={() => {
                  setAuthBusy(true);
                  setAuthError(undefined);
                  void sendCode().catch((cause) => setAuthError(cause instanceof Error ? cause.message : String(cause))).finally(() => setAuthBusy(false));
                }}>
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Enviar código nuevo"}
                </button>
              ) : null}
            </form>
          )}
        </article>
        <article className="settings-card">
          <h2><KeyRound size={19} /> OpenAI BYOK</h2>
          <p>La clave se guarda en Keychain/DPAPI. Nunca entra en SQLite, logs o frontend persistente.</p>
          <input type="password" autoComplete="off" placeholder="sk-…" value={key} onChange={(event) => setKey(event.target.value)} />
          <div className="inline-actions">
            <button className="primary" disabled={key.length < 20} onClick={() => void onSaveKey(key).then(() => setKey(""))}>Guardar</button>
            <button className="ghost" onClick={() => void onDeleteKey()}>Eliminar</button>
          </div>
        </article>
        <article className="settings-card wide transmission-card">
          <div><Eye size={23} /><h2>Antes de cada llamada podés ver exactamente qué sale.</h2></div>
          <ul>
            <li><LockKeyhole size={15} /> Nunca enviamos rutas locales.</li>
            <li><LockKeyhole size={15} /> Imágenes: JPEG reducido sin EXIF.</li>
            <li><LockKeyhole size={15} /> PDF: texto extraído; nunca PDF original.</li>
            <li><LockKeyhole size={15} /> Hosted: nombre actual sin carpeta ni ruta, para evitar propuestas peores.</li>
          </ul>
          <p>OpenAI puede retener contenido en abuse-monitoring logs hasta 30 días según tu configuración contractual. Naming Police no persiste contenido.</p>
        </article>
      </div>
    </section>
  );
}
