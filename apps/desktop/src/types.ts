import type {
  ConfidenceBand,
  DataSource,
  FolderMode,
  JobStatus,
  Locale,
  PresetId,
  UsageSnapshot,
} from "@naming-police/contracts";

export interface WatchedFolder {
  id: string;
  path: string;
  display_name: string;
  preset: PresetId;
  mode: FolderMode;
  is_paused: boolean;
  pause_until?: string;
  include_subfolders: boolean;
  extensions: string[];
  pending_count: number;
  automatic_eligible: boolean;
  trust: { decisions: number; accepted_unchanged: number; recent_undos: number };
}

export interface Suggestion {
  id: string;
  job_id: string;
  current_name: string;
  proposed_name: string;
  folder_name: string;
  file_kind: "image" | "document";
  thumbnail_data_url?: string;
  confidence: number;
  confidence_band: ConfidenceBand;
  explanation: string;
  sources: DataSource[];
  status: JobStatus;
  created_at: string;
  collision: boolean;
}

export interface HistoryEntry {
  id: string;
  old_name: string;
  new_name: string;
  folder_name: string;
  action: "rename" | "undo";
  status: string;
  created_at: string;
  can_undo: boolean;
  error?: string;
}

export interface AppSettings {
  locale: Locale;
  output_locale: Locale;
  remote_ai_enabled: boolean;
  provider: "hosted" | "byok" | "local";
  notify_suggestions: boolean;
  auto_updates: boolean;
  onboarding_complete: boolean;
}

export interface AppSnapshot {
  folders: WatchedFolder[];
  suggestions: Suggestion[];
  history: HistoryEntry[];
  settings: AppSettings;
  usage?: UsageSnapshot;
  watcher_active: boolean;
  authenticated: boolean;
}
