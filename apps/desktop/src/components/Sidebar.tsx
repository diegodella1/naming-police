import {
  ArchiveRestore,
  FileCheck2,
  FolderCog,
  Gauge,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { Locale } from "@naming-police/contracts";
import { t } from "../lib/i18n";

export type ViewId = "inbox" | "folders" | "history" | "privacy" | "settings";

interface Props {
  view: ViewId;
  locale: Locale;
  pending: number;
  watcherActive: boolean;
  onNavigate: (view: ViewId) => void;
}

export function Sidebar({ view, locale, pending, watcherActive, onNavigate }: Props) {
  const copy = t(locale);
  const items = [
    { id: "inbox" as const, label: copy.inbox, icon: FileCheck2, badge: pending || undefined },
    { id: "folders" as const, label: copy.folders, icon: FolderCog },
    { id: "history" as const, label: copy.history, icon: ArchiveRestore },
    { id: "privacy" as const, label: copy.privacy, icon: ShieldCheck },
    { id: "settings" as const, label: copy.settings, icon: Settings },
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup" aria-label="Naming Police">
        <div className="brand-mark">NP</div>
        <div>
          <strong>NAMING</strong>
          <span>POLICE</span>
        </div>
      </div>
      <nav aria-label="Principal">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => onNavigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.badge ? <em>{item.badge}</em> : null}
            </button>
          );
        })}
      </nav>
      <div className="watch-status">
        <Gauge size={17} />
        <div>
          <strong>{watcherActive ? "MONITOREO ACTIVO" : "MONITOREO EN PAUSA"}</strong>
          <span>{watcherActive ? "Observando cambios" : "Sin carpetas activas"}</span>
        </div>
        <i className={watcherActive ? "status-dot live" : "status-dot"} />
      </div>
    </aside>
  );
}
