import { ArchiveRestore, RotateCcw } from "lucide-react";
import type { HistoryEntry } from "../types";

export function History({
  history,
  onUndo,
}: {
  history: HistoryEntry[];
  onUndo: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <header className="page-header">
        <div><p className="eyebrow">CADENA DE CUSTODIA</p><h1>Historial</h1></div>
      </header>
      {history.length === 0 ? (
        <div className="empty-panel"><ArchiveRestore size={34} /><h2>Sin cambios todavía</h2><p>Cada rename y undo quedará registrado acá.</p></div>
      ) : (
        <div className="history-table" role="table">
          {history.map((entry) => (
            <div className="history-row" role="row" key={entry.id}>
              <time>{new Date(entry.created_at).toLocaleString()}</time>
              <div><span>{entry.old_name}</span><strong>{entry.new_name}</strong></div>
              <span className={`operation-state ${entry.status}`}>{entry.status}</span>
              <span>{entry.folder_name}</span>
              <button
                className="ghost"
                disabled={!entry.can_undo}
                onClick={() => void onUndo(entry.id)}
              ><RotateCcw size={15} /> Undo</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
