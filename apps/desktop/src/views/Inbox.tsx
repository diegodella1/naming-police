import { Check, Edit3, FileText, Image, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import type { Suggestion } from "../types";
import { Confidence } from "../components/Confidence";

interface Props {
  suggestions: Suggestion[];
  onApprove: (id: string, name?: string) => Promise<void>;
  onIgnore: (id: string) => Promise<void>;
  onInspectPayload: (id: string) => Promise<void>;
}

export function Inbox({ suggestions, onApprove, onIgnore, onInspectPayload }: Props) {
  const [editing, setEditing] = useState<string>();
  const [editedName, setEditedName] = useState("");
  if (suggestions.length === 0) {
    return (
      <section className="empty-state">
        <div className="empty-stamp"><Check size={38} /></div>
        <p className="eyebrow">BANDEJA · 0 PENDIENTES</p>
        <h1>Todo bajo control.</h1>
        <p>Los archivos nuevos aparecerán acá antes de cambiar de nombre.</p>
      </section>
    );
  }
  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">CASOS ABIERTOS · {suggestions.length}</p>
          <h1>Bandeja de revisión</h1>
        </div>
        <p className="header-note">Nada cambia hasta que lo apruebes.</p>
      </header>
      <div className="suggestion-list">
        {suggestions.map((suggestion, index) => {
          const isEditing = editing === suggestion.id;
          return (
            <article className="suggestion-card" key={suggestion.id}>
              <div className="case-number">#{String(index + 1).padStart(3, "0")}</div>
              <div className="file-preview">
                {suggestion.thumbnail_data_url ? (
                  <img src={suggestion.thumbnail_data_url} alt="" />
                ) : suggestion.file_kind === "image" ? (
                  <Image size={34} />
                ) : (
                  <FileText size={34} />
                )}
              </div>
              <div className="suggestion-main">
                <div className="filename-pair">
                  <span className="old-name">{suggestion.current_name}</span>
                  <span className="arrow">→</span>
                  {isEditing ? (
                    <input
                      className="filename-editor"
                      value={editedName}
                      maxLength={100}
                      autoFocus
                      onChange={(event) => setEditedName(event.target.value)}
                      aria-label="Nombre propuesto"
                    />
                  ) : (
                    <strong className="new-name">{suggestion.proposed_name}</strong>
                  )}
                </div>
                <div className="suggestion-meta">
                  <span>{suggestion.folder_name}</span>
                  <Confidence band={suggestion.confidence_band} value={suggestion.confidence} />
                  {suggestion.collision ? <span className="warning">COLISIÓN RESUELTA</span> : null}
                </div>
                <p className="explanation">{suggestion.explanation}</p>
                <div className="sources">
                  {suggestion.sources.map((source) => <span key={source}>{source}</span>)}
                  <button onClick={() => onInspectPayload(suggestion.id)}>
                    <ShieldAlert size={13} /> qué se enviará
                  </button>
                </div>
              </div>
              <div className="suggestion-actions">
                {isEditing ? (
                  <>
                    <button
                      className="primary square"
                      onClick={() => {
                        void onApprove(suggestion.id, editedName);
                        setEditing(undefined);
                      }}
                      aria-label="Guardar y aceptar"
                    ><Check size={19} /></button>
                    <button className="ghost square" onClick={() => setEditing(undefined)} aria-label="Cancelar">
                      <X size={19} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="primary" onClick={() => void onApprove(suggestion.id)}>
                      <Check size={17} /> Aceptar
                    </button>
                    <button
                      className="ghost square"
                      onClick={() => {
                        setEditing(suggestion.id);
                        setEditedName(suggestion.proposed_name);
                      }}
                      aria-label="Editar"
                    ><Edit3 size={17} /></button>
                    <button className="ghost square" onClick={() => void onIgnore(suggestion.id)} aria-label="Ignorar">
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
