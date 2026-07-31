use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PresetId {
    General,
    Screenshots,
    TravelPhotos,
    Invoices,
    Custom,
}

impl PresetId {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::General => "general",
            Self::Screenshots => "screenshots",
            Self::TravelPhotos => "travel_photos",
            Self::Invoices => "invoices",
            Self::Custom => "custom",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FolderMode {
    Observe,
    Ask,
    Automatic,
}

impl FolderMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Observe => "observe",
            Self::Ask => "ask",
            Self::Automatic => "automatic",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Trust {
    pub decisions: i64,
    pub accepted_unchanged: i64,
    pub recent_undos: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct WatchedFolder {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub preset: String,
    pub mode: String,
    pub is_paused: bool,
    pub pause_until: Option<String>,
    pub include_subfolders: bool,
    pub extensions: Vec<String>,
    pub pending_count: i64,
    pub automatic_eligible: bool,
    pub trust: Trust,
}

#[derive(Debug, Clone, Serialize)]
pub struct Suggestion {
    pub id: String,
    pub job_id: String,
    pub current_name: String,
    pub proposed_name: String,
    pub folder_name: String,
    pub file_kind: String,
    pub thumbnail_data_url: Option<String>,
    pub confidence: f64,
    pub confidence_band: String,
    pub explanation: String,
    pub sources: Vec<String>,
    pub status: String,
    pub created_at: String,
    pub collision: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoryEntry {
    pub id: String,
    pub old_name: String,
    pub new_name: String,
    pub folder_name: String,
    pub action: String,
    pub status: String,
    pub created_at: String,
    pub can_undo: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub locale: String,
    pub output_locale: String,
    pub remote_ai_enabled: bool,
    pub provider: String,
    pub notify_suggestions: bool,
    pub auto_updates: bool,
    pub onboarding_complete: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            locale: "es".into(),
            output_locale: "es".into(),
            remote_ai_enabled: true,
            provider: "hosted".into(),
            notify_suggestions: true,
            auto_updates: true,
            onboarding_complete: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSnapshot {
    pub period: String,
    pub used: i64,
    pub limit: i64,
    pub reserved: i64,
    pub resets_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppSnapshot {
    pub folders: Vec<WatchedFolder>,
    pub suggestions: Vec<Suggestion>,
    pub history: Vec<HistoryEntry>,
    pub settings: AppSettings,
    pub usage: Option<UsageSnapshot>,
    pub watcher_active: bool,
    pub authenticated: bool,
}

#[derive(Debug, Clone)]
pub struct SuggestionRecord {
    pub folder_id: String,
    pub path: String,
    pub proposed_name: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldEvidence {
    pub value: String,
    pub source: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AnalysisFields {
    pub scene: Option<FieldEvidence>,
    pub subject: Option<FieldEvidence>,
    pub activity: Option<FieldEvidence>,
    pub landmark: Option<FieldEvidence>,
    pub document_type: Option<FieldEvidence>,
    pub topic: Option<FieldEvidence>,
    pub vendor: Option<FieldEvidence>,
    pub document_date: Option<FieldEvidence>,
    pub currency: Option<FieldEvidence>,
    pub amount: Option<FieldEvidence>,
    pub invoice_number: Option<FieldEvidence>,
    pub person: Option<FieldEvidence>,
    pub role: Option<FieldEvidence>,
    pub organization: Option<FieldEvidence>,
    pub document_title: Option<FieldEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub schema_version: String,
    pub request_id: String,
    pub fields: AnalysisFields,
    pub confidence: f64,
    pub unsafe_or_sensitive: bool,
    pub model: String,
}
