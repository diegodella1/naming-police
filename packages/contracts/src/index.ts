export const SCHEMA_VERSION = "1" as const;

export type Locale = "es" | "en";
export type PresetId =
  | "general"
  | "screenshots"
  | "travel_photos"
  | "invoices"
  | "custom";
export type FolderMode = "observe" | "ask" | "automatic";
export type ConfidenceBand = "low" | "medium" | "high";
export type DataSource =
  | "filename"
  | "metadata"
  | "exif"
  | "gps"
  | "ocr"
  | "pdf_text"
  | "ai"
  | "user";

export type JobStatus =
  | "detected"
  | "waiting_for_stability"
  | "extracting"
  | "awaiting_ai"
  | "suggested"
  | "approved"
  | "renamed"
  | "ignored"
  | "failed"
  | "undone";

export interface FieldEvidence {
  value: string;
  source: DataSource;
  confidence: number;
}

export interface AnalysisFields {
  scene?: FieldEvidence;
  subject?: FieldEvidence;
  activity?: FieldEvidence;
  landmark?: FieldEvidence;
  document_type?: FieldEvidence;
  topic?: FieldEvidence;
  vendor?: FieldEvidence;
  document_date?: FieldEvidence;
  currency?: FieldEvidence;
  amount?: FieldEvidence;
  invoice_number?: FieldEvidence;
}

export interface SafeMetadata {
  captured_at?: string;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
  page_count?: number;
  mime_type: string;
}

export interface AnalysisRequestV1 {
  schema_version: typeof SCHEMA_VERSION;
  request_id: string;
  preset: PresetId;
  locale: Locale;
  media_kind: "image" | "document";
  metadata: SafeMetadata;
  thumbnail_base64?: string;
  extracted_text?: string;
}

export interface AnalysisResultV1 {
  schema_version: typeof SCHEMA_VERSION;
  request_id: string;
  fields: AnalysisFields;
  confidence: number;
  unsafe_or_sensitive: boolean;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface UsageSnapshot {
  period: string;
  used: number;
  limit: number;
  reserved: number;
  resets_at: string;
}

export interface ApiError {
  code:
    | "validation"
    | "unauthorized"
    | "quota_exceeded"
    | "provider_error"
    | "rate_limited"
    | "internal";
  message: string;
  retryable: boolean;
}

export interface ExportedConfigV1 {
  schema_version: typeof SCHEMA_VERSION;
  locale: Locale;
  remote_ai_enabled: boolean;
  folders: Array<{
    path: string;
    preset: PresetId;
    mode: FolderMode;
    include_subfolders: boolean;
    extensions: string[];
  }>;
}

const allowedTopLevelKeys = new Set([
  "schema_version",
  "request_id",
  "fields",
  "confidence",
  "unsafe_or_sensitive",
  "model",
  "usage",
]);

export function assertAnalysisResult(value: unknown): asserts value is AnalysisResultV1 {
  if (!value || typeof value !== "object") throw new Error("Result must be an object");
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!allowedTopLevelKeys.has(key)) throw new Error(`Unexpected field: ${key}`);
  }
  if (record.schema_version !== SCHEMA_VERSION) throw new Error("Unsupported schema");
  if (typeof record.request_id !== "string") throw new Error("Missing request_id");
  if (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1) {
    throw new Error("Invalid confidence");
  }
  if (typeof record.unsafe_or_sensitive !== "boolean") throw new Error("Invalid sensitivity");
  if (!record.fields || typeof record.fields !== "object") throw new Error("Missing fields");
}

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}
