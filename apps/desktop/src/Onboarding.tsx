import { ArrowRight, Eye, FolderPlus, KeyRound, MonitorCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FolderMode, PresetId } from "@naming-police/contracts";

interface Props {
  onPick: () => Promise<string | null>;
  onComplete: (path: string, preset: PresetId, mode: FolderMode, provider: "hosted" | "byok" | "local") => Promise<void>;
}

export function Onboarding({ onPick, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState("");
  const [preset, setPreset] = useState<PresetId>("general");
  const [provider, setProvider] = useState<"hosted" | "byok" | "local">("hosted");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const steps = ["Promesa", "Carpeta", "Preset", "Análisis", "Listo"];
  const pickFolder = async () => {
    setError(undefined);
    try {
      const selected = await onPick();
      if (selected) setPath(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const complete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await onComplete(path, preset, "ask", provider);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="onboarding-shell">
      <aside className="onboarding-aside">
        <div className="brand-lockup inverse"><div className="brand-mark">NP</div><div><strong>NAMING</strong><span>POLICE</span></div></div>
        <div className="onboarding-progress">
          {steps.map((label, index) => (
            <div className={index === step ? "current" : index < step ? "done" : ""} key={label}>
              <i>{index < step ? "✓" : index + 1}</i><span>{label}</span>
            </div>
          ))}
        </div>
        <p>Tus archivos permanecen en tu computadora. Vos decidís cuándo usar IA remota.</p>
      </aside>
      <section className="onboarding-content">
        {step === 0 ? (
          <div className="onboarding-step">
            <p className="eyebrow">BIENVENIDO AL ORDEN</p>
            <h1>Archivos útiles.<br />Desde que aparecen.</h1>
            <p>Naming Police observa carpetas elegidas, entiende imágenes y PDF, propone nombres descriptivos y permite deshacer cada cambio.</p>
            <div className="promise-grid">
              <span><Eye /> Preview antes de cambiar</span>
              <span><ShieldCheck /> Nunca sobrescribe</span>
              <span><MonitorCheck /> Procesamiento local-first</span>
            </div>
            <button className="primary large" onClick={() => setStep(1)}>Configurar <ArrowRight /></button>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="onboarding-step">
            <p className="eyebrow">PASO 1 · JURISDICCIÓN</p><h1>Elegí una carpeta.</h1>
            <p>Downloads o Screenshots son buenos puntos de partida. Carpetas riesgosas serán bloqueadas.</p>
            <button className="folder-picker" onClick={() => void pickFolder()}>
              <FolderPlus /> <span>{path || "Seleccionar carpeta local"}</span>
            </button>
            {error ? <p className="inline-error" role="alert">{error}</p> : null}
            <button className="primary large" disabled={!path} onClick={() => setStep(2)}>Continuar <ArrowRight /></button>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="onboarding-step">
            <p className="eyebrow">PASO 2 · CRITERIO</p><h1>¿Qué aparece ahí?</h1>
            <div className="choice-grid">
              {[
                ["general", "General / Downloads", "PDF, imágenes y descargas variadas."],
                ["screenshots", "Screenshots", "Prioriza tema, acción o error visible."],
                ["invoices", "Facturas", "Proveedor, fecha, moneda y monto."],
                ["travel_photos", "Fotos de viaje", "Escena, fecha y ubicación verificable."],
              ].map(([id, title, text]) => (
                <button className={preset === id ? "choice selected" : "choice"} onClick={() => setPreset(id as PresetId)} key={id}>
                  <strong>{title}</strong><span>{text}</span>
                </button>
              ))}
            </div>
            <button className="primary large" onClick={() => setStep(3)}>Continuar <ArrowRight /></button>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="onboarding-step">
            <p className="eyebrow">PASO 3 · PRIVACIDAD</p><h1>Elegí cómo analizar.</h1>
            <div className="choice-grid">
              {[
                ["hosted", "Hosted AI", "Incluido según cuota. Miniatura o texto mínimo."],
                ["byok", "Tu API key", "Conexión directa a OpenAI; key en almacén seguro."],
                ["local", "Solo local", "Sin transmisión. Menos comprensión semántica."],
              ].map(([id, title, text]) => (
                <button className={provider === id ? "choice selected" : "choice"} onClick={() => setProvider(id as typeof provider)} key={id}>
                  <KeyRound /><strong>{title}</strong><span>{text}</span>
                </button>
              ))}
            </div>
            <p className="consent-note">Modo inicial: <strong>Ask</strong>. Nada se renombra automáticamente.</p>
            <button className="primary large" onClick={() => setStep(4)}>Continuar <ArrowRight /></button>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="onboarding-step finish">
            <div className="empty-stamp"><ShieldCheck size={42} /></div>
            <p className="eyebrow">CONFIGURACIÓN COMPLETA</p><h1>Patrulla lista.</h1>
            <p>Vamos a observar archivos nuevos. Las primeras propuestas llegarán a tu bandeja.</p>
            {error ? <p className="inline-error" role="alert">{error}</p> : null}
            <button className="primary large" disabled={submitting} onClick={() => void complete()}>
              {submitting ? "Abriendo…" : "Abrir Naming Police"} {!submitting ? <ArrowRight /> : null}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
