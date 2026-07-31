import { Folder, MoreHorizontal, Pause, Play, Plus, Radar, ScanSearch, Trash2 } from "lucide-react";
import type { FolderMode, PresetId } from "@naming-police/contracts";
import type { WatchedFolder } from "../types";

const presetLabels: Record<PresetId, string> = {
  general: "General / Downloads",
  screenshots: "Screenshots",
  travel_photos: "Travel Photos",
  invoices: "Invoices",
  custom: "Custom",
};

interface Props {
  folders: WatchedFolder[];
  onAdd: () => Promise<void>;
  onPause: (folder: WatchedFolder) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onScan: (id: string) => Promise<void>;
  onMode: (id: string, mode: FolderMode) => Promise<void>;
}

export function Folders({ folders, onAdd, onPause, onRemove, onScan, onMode }: Props) {
  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">JURISDICCIÓN LOCAL</p>
          <h1>Carpetas vigiladas</h1>
        </div>
        <button className="primary" onClick={() => void onAdd()}><Plus size={17} /> Agregar carpeta</button>
      </header>
      {folders.length === 0 ? (
        <div className="empty-panel">
          <Folder size={34} />
          <h2>Elegí dónde empezar</h2>
          <p>Recomendamos Downloads o tu carpeta de screenshots.</p>
          <button className="primary" onClick={() => void onAdd()}><Plus size={17} /> Agregar carpeta</button>
        </div>
      ) : (
        <div className="folder-grid">
          {folders.map((folder) => (
            <article className="folder-card" key={folder.id}>
              <div className="folder-card-top">
                <div className="folder-icon"><Folder /></div>
                <button className="ghost square" aria-label="Más opciones"><MoreHorizontal /></button>
              </div>
              <h2>{folder.display_name}</h2>
              <p className="path" title={folder.path}>{folder.path}</p>
              <div className="folder-stats">
                <span><Radar size={15} /> {folder.is_paused ? "Pausada" : "Activa"}</span>
                <span>{folder.pending_count} pendientes</span>
              </div>
              <label>
                Preset
                <strong>{presetLabels[folder.preset]}</strong>
              </label>
              <label>
                Modo
                <select
                  value={folder.mode}
                  onChange={(event) => void onMode(folder.id, event.target.value as FolderMode)}
                >
                  <option value="observe">Observe</option>
                  <option value="ask">Ask</option>
                  <option value="automatic" disabled={!folder.automatic_eligible}>Automatic</option>
                </select>
              </label>
              <div className="trust-meter">
                <div style={{ width: `${Math.min(100, folder.trust.decisions * 5)}%` }} />
              </div>
              <small>
                Automatic: {folder.automatic_eligible ? "habilitado" : `${folder.trust.decisions}/20 decisiones`}
              </small>
              <div className="folder-actions">
                <button className="ghost" onClick={() => void onPause(folder)}>
                  {folder.is_paused ? <Play size={16} /> : <Pause size={16} />}
                  {folder.is_paused ? "Reanudar" : "Pausar"}
                </button>
                <button className="ghost" onClick={() => void onScan(folder.id)}><ScanSearch size={16} /> Escanear</button>
                <button className="danger-icon" onClick={() => void onRemove(folder.id)} aria-label="Quitar carpeta">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
