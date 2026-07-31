import { useCallback, useEffect, useState } from "react";
import type { FolderMode } from "@naming-police/contracts";
import { Sidebar, type ViewId } from "./components/Sidebar";
import { Toast, type ToastState } from "./components/Toast";
import { bridge } from "./lib/bridge";
import { requestEmailOtp, verifyEmailOtp } from "./lib/auth";
import { Onboarding } from "./Onboarding";
import type { AppSnapshot, WatchedFolder } from "./types";
import { Folders } from "./views/Folders";
import { History } from "./views/History";
import { Inbox } from "./views/Inbox";
import { Privacy } from "./views/Privacy";
import { Settings } from "./views/Settings";

const initial: AppSnapshot = {
  folders: [], suggestions: [], history: [],
  settings: { locale: "es", output_locale: "es", remote_ai_enabled: true, provider: "hosted", notify_suggestions: true, auto_updates: true, onboarding_complete: false },
  watcher_active: false, authenticated: false,
};

export default function App() {
  const [snapshot, setSnapshot] = useState(initial);
  const [view, setView] = useState<ViewId>("inbox");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>();
  const refresh = useCallback(async () => setSnapshot(await bridge.snapshot()), []);
  const notify = (message: string, kind: ToastState["kind"] = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(undefined), 3500);
  };
  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      await refresh();
      if (success) notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  };
  useEffect(() => {
    void refresh().catch((error) => notify(String(error), "error")).finally(() => setLoading(false));
    const interval = window.setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);
  if (loading) return <div className="boot-screen"><div className="brand-mark">NP</div><span>Abriendo expediente…</span></div>;
  if (!snapshot.settings.onboarding_complete) {
    return (
      <Onboarding
        onPick={bridge.pickFolder}
        onComplete={async (path, preset, mode, provider) => {
          await bridge.addFolder(path, preset, mode);
          await bridge.setSetting("provider", provider);
          await bridge.finishOnboarding();
          await refresh();
        }}
      />
    );
  }
  const page = {
    inbox: <Inbox suggestions={snapshot.suggestions} onApprove={(id, name) => run(() => bridge.approve(id, name), "Archivo renombrado")} onIgnore={(id) => run(() => bridge.ignore(id), "Sugerencia ignorada")} onInspectPayload={async (id) => notify(JSON.stringify(await bridge.previewPayload(id)), "success")} />,
    folders: <Folders folders={snapshot.folders} onAdd={async () => { const path = await bridge.pickFolder(); if (path) await run(() => bridge.addFolder(path, "general", "ask"), "Carpeta agregada"); }} onPause={(folder: WatchedFolder) => run(() => folder.is_paused ? bridge.resumeFolder(folder.id) : bridge.pauseFolder(folder.id, 60))} onRemove={(id) => run(() => bridge.removeFolder(id), "Carpeta removida; archivos intactos")} onScan={(id) => run(() => bridge.scanFolder(id), "Escaneo agregado a la cola")} onMode={(id, mode: FolderMode) => run(() => bridge.setFolderMode(id, mode))} />,
    history: <History history={snapshot.history} onUndo={(id) => run(() => bridge.undo(id), "Nombre restaurado")} />,
    privacy: <Privacy settings={snapshot.settings} authenticated={snapshot.authenticated} used={snapshot.usage?.used ?? 0} limit={snapshot.usage?.limit ?? 100} onProvider={(provider) => run(() => bridge.setSetting("provider", provider))} onSaveKey={(key) => run(() => bridge.setByok(key), "API key guardada")} onDeleteKey={() => run(bridge.deleteByok, "API key eliminada")} onLogin={async (email, code) => { if (!code) { await requestEmailOtp(email); notify("Código enviado"); return "sent"; } const tokens = await verifyEmailOtp(email, code); await bridge.storeSession(tokens.accessToken, tokens.refreshToken); await refresh(); notify("Sesión iniciada"); return "verified"; }} onSignOut={() => run(bridge.signOut, "Sesión cerrada")} />,
    settings: <Settings settings={snapshot.settings} onSetting={(key, value) => run(() => bridge.setSetting(key, value))} onExport={() => run(async () => { const content = await bridge.exportConfig(); await navigator.clipboard.writeText(content); }, "Configuración copiada")} onImport={() => run(async () => { const value = await navigator.clipboard.readText(); await bridge.importConfig(value); }, "Configuración importada")} onClearHistory={() => run(bridge.clearHistory, "Historial eliminado")} />,
  }[view];
  return (
    <div className="app-shell">
      <Sidebar view={view} locale={snapshot.settings.locale} pending={snapshot.suggestions.length} watcherActive={snapshot.watcher_active} onNavigate={setView} />
      <main className="content">{page}</main>
      <Toast toast={toast} />
    </div>
  );
}
