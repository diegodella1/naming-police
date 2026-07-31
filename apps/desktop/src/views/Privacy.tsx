import { Eye, KeyRound, LockKeyhole, Server, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";
import type { AppSettings } from "../types";

interface Props {
  settings: AppSettings;
  authenticated: boolean;
  used: number;
  limit: number;
  onProvider: (provider: AppSettings["provider"]) => Promise<void>;
  onSaveKey: (key: string) => Promise<void>;
  onDeleteKey: () => Promise<void>;
  onLogin: (email: string, code?: string) => Promise<"sent" | "verified">;
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
  onLogin,
  onSignOut,
}: Props) {
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
                void onLogin(email, otpSent ? code : undefined).then((status) => setOtpSent(status === "sent"));
              }}
            >
              <p>Ingresá con código email. Sin contraseña ni navegador externo.</p>
              <input type="email" required placeholder="vos@ejemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              {otpSent ? <input required inputMode="numeric" pattern="[0-9]{6}" placeholder="Código de 6 dígitos" value={code} onChange={(event) => setCode(event.target.value)} /> : null}
              <button className="primary" type="submit">{otpSent ? "Verificar código" : "Enviar código"}</button>
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
          </ul>
          <p>OpenAI puede retener contenido en abuse-monitoring logs hasta 30 días según tu configuración contractual. Naming Police no persiste contenido.</p>
        </article>
      </div>
    </section>
  );
}
