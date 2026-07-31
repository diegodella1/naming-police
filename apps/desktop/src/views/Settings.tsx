import { Download, Languages, Save, Trash2, Upload } from "lucide-react";
import type { Locale } from "@naming-police/contracts";
import type { AppSettings } from "../types";

interface Props {
  settings: AppSettings;
  onSetting: (key: string, value: unknown) => Promise<void>;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onClearHistory: () => Promise<void>;
}

export function Settings({ settings, onSetting, onExport, onImport, onClearHistory }: Props) {
  return (
    <section>
      <header className="page-header"><div><p className="eyebrow">REGLAMENTO</p><h1>Ajustes</h1></div></header>
      <div className="settings-stack">
        <article className="settings-card">
          <h2><Languages size={19} /> Idiomas</h2>
          <label>Interfaz
            <select value={settings.locale} onChange={(event) => void onSetting("locale", event.target.value as Locale)}>
              <option value="es">Español</option><option value="en">English</option>
            </select>
          </label>
          <label>Nombres generados
            <select value={settings.output_locale} onChange={(event) => void onSetting("output_locale", event.target.value as Locale)}>
              <option value="es">Español</option><option value="en">English</option>
            </select>
          </label>
        </article>
        <article className="settings-card">
          <h2><Save size={19} /> Comportamiento</h2>
          <label className="switch-row">Notificar propuestas
            <input type="checkbox" checked={settings.notify_suggestions} onChange={(event) => void onSetting("notify_suggestions", event.target.checked)} />
          </label>
          <label className="switch-row">Actualizaciones automáticas
            <input type="checkbox" checked={settings.auto_updates} onChange={(event) => void onSetting("auto_updates", event.target.checked)} />
          </label>
        </article>
        <article className="settings-card">
          <h2><Download size={19} /> Configuración portable</h2>
          <p>Exporta presets y preferencias. Nunca incluye API keys, sesiones ni historial.</p>
          <div className="inline-actions">
            <button className="ghost" onClick={() => void onExport()}><Download size={16} /> Exportar</button>
            <button className="ghost" onClick={() => void onImport()}><Upload size={16} /> Importar</button>
          </div>
        </article>
        <article className="settings-card danger-zone">
          <h2><Trash2 size={19} /> Datos locales</h2>
          <p>Elimina historial completado. Carpetas, archivos y sugerencias pendientes no cambian.</p>
          <button className="danger" onClick={() => void onClearHistory()}>Borrar historial</button>
        </article>
      </div>
    </section>
  );
}
