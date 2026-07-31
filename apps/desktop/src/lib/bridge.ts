import { invoke, isTauri } from "@tauri-apps/api/core";
import type { FolderMode, PresetId } from "@naming-police/contracts";
import type { AppSnapshot } from "../types";

const demoSnapshot: AppSnapshot = {
  folders: [],
  suggestions: [],
  history: [],
  settings: {
    locale: "es",
    output_locale: "es",
    remote_ai_enabled: true,
    provider: "hosted",
    notify_suggestions: true,
    auto_updates: true,
    onboarding_complete: false,
  },
  watcher_active: false,
  authenticated: false,
};

async function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    if (name === "get_app_snapshot") return demoSnapshot as T;
    throw new Error("Native command requires the Tauri desktop runtime");
  }
  return invoke<T>(name, args);
}

export const bridge = {
  snapshot: () => command<AppSnapshot>("get_app_snapshot"),
  pickFolder: () => command<string | null>("pick_folder"),
  addFolder: (path: string, preset: PresetId, mode: FolderMode) =>
    command<void>("add_watched_folder", { path, preset, mode }),
  removeFolder: (id: string) => command<void>("remove_watched_folder", { id }),
  pauseFolder: (id: string, minutes?: number) =>
    command<void>("pause_watched_folder", { id, minutes: minutes ?? null }),
  resumeFolder: (id: string) => command<void>("resume_watched_folder", { id }),
  setFolderMode: (id: string, mode: FolderMode) =>
    command<void>("set_folder_mode", { id, mode }),
  scanFolder: (id: string, limit = 100) => command<number>("scan_folder", { id, limit }),
  approve: (id: string, editedName?: string) =>
    command<void>("approve_suggestion", { id, editedName: editedName ?? null }),
  ignore: (id: string) => command<void>("ignore_suggestion", { id }),
  undo: (id: string) => command<void>("undo_operation", { id }),
  setSetting: (key: string, value: unknown) =>
    command<void>("set_setting", { key, value: JSON.stringify(value) }),
  finishOnboarding: () => command<void>("finish_onboarding"),
  setByok: (apiKey: string) => command<void>("store_byok_key", { apiKey }),
  deleteByok: () => command<void>("delete_byok_key"),
  previewPayload: (suggestionId: string) =>
    command<Record<string, unknown>>("preview_remote_payload", { suggestionId }),
  exportConfig: () => command<string>("export_config"),
  importConfig: (value: string) => command<void>("import_config", { value }),
  clearHistory: () => command<void>("clear_history"),
  requestHostedOtp: (email: string) => command<void>("request_hosted_otp", { email }),
  verifyHostedOtp: (email: string, code: string) =>
    command<void>("verify_hosted_otp", { email, code }),
  retryStoreHostedSession: () => command<void>("retry_store_hosted_session"),
  signOut: () => command<void>("sign_out"),
};
