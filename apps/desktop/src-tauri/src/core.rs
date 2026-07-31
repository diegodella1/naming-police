use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration as StdDuration, Instant},
};

use chrono::{Duration, Utc};
use keyring::Entry;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use uuid::Uuid;
use walkdir::WalkDir;

use crate::{
    ai,
    database::Database,
    error::{AppError, Result},
    extract::{self, ExtractedContent},
    models::{AnalysisResult, AppSnapshot, FolderMode, PresetId, UsageSnapshot, WatchedFolder},
    naming, safety,
};

const DEFAULT_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "webp", "tif", "tiff", "heic", "heif", "pdf",
];
const KEYRING_SERVICE: &str = "ar.diegodella.namingpolice";
const SESSION_ACCOUNT: &str = "hosted_session_v1";

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SessionTokens {
    pub access_token: String,
    pub refresh_token: String,
}

#[cfg(debug_assertions)]
fn hosted_api_url() -> &'static str {
    option_env!("HOSTED_API_URL").unwrap_or("http://127.0.0.1:8787")
}

#[cfg(not(debug_assertions))]
fn hosted_api_url() -> &'static str {
    env!(
        "HOSTED_API_URL",
        "HOSTED_API_URL is required for release builds"
    )
}

#[cfg(debug_assertions)]
fn supabase_url() -> Result<&'static str> {
    option_env!("SUPABASE_URL")
        .ok_or_else(|| AppError::Secret("SUPABASE_URL no configurada en build".into()))
}

#[cfg(not(debug_assertions))]
fn supabase_url() -> Result<&'static str> {
    Ok(env!(
        "SUPABASE_URL",
        "SUPABASE_URL is required for release builds"
    ))
}

#[cfg(debug_assertions)]
fn supabase_anon_key() -> Result<&'static str> {
    option_env!("SUPABASE_ANON_KEY")
        .ok_or_else(|| AppError::Secret("SUPABASE_ANON_KEY no configurada en build".into()))
}

#[cfg(not(debug_assertions))]
fn supabase_anon_key() -> Result<&'static str> {
    Ok(env!(
        "SUPABASE_ANON_KEY",
        "SUPABASE_ANON_KEY is required for release builds"
    ))
}

pub struct Core {
    pub database: Arc<Database>,
    app: AppHandle,
    watcher: Mutex<Option<RecommendedWatcher>>,
    usage_cache: Mutex<Option<(Instant, UsageSnapshot)>>,
    pending_session: Mutex<Option<SessionTokens>>,
}

impl Core {
    pub fn new(database: Database, app: AppHandle) -> Arc<Self> {
        Arc::new(Self {
            database: Arc::new(database),
            app,
            watcher: Mutex::new(None),
            usage_cache: Mutex::new(None),
            pending_session: Mutex::new(None),
        })
    }

    pub fn initialize(self: &Arc<Self>) -> Result<()> {
        self.recover_operations()?;
        let weak = Arc::downgrade(self);
        let watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
            let Ok(event) = event else { return };
            if !matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                return;
            }
            for path in event.paths {
                if let Some(core) = weak.upgrade() {
                    core.schedule_path(path);
                }
            }
        })
        .map_err(|error| AppError::Io(std::io::Error::other(error.to_string())))?;
        *self
            .watcher
            .lock()
            .map_err(|_| AppError::Validation("Watcher bloqueado".into()))? = Some(watcher);
        for folder in self.database.list_folders()? {
            if !folder.is_paused {
                self.watch(&folder)?;
            }
        }
        for path in self.database.take_rule_upgrade_jobs()? {
            self.clone().schedule_path(PathBuf::from(path));
        }
        Ok(())
    }

    pub fn snapshot(&self) -> Result<AppSnapshot> {
        let folders = self.database.list_folders()?;
        for folder in &folders {
            if folder.is_paused
                && folder
                    .pause_until
                    .as_deref()
                    .and_then(|value| chrono::DateTime::parse_from_rfc3339(value).ok())
                    .is_some_and(|until| until < Utc::now())
            {
                let _ = self.resume_folder(&folder.id);
            }
        }
        let folders = self.database.list_folders()?;
        let watcher_active = folders.iter().any(|folder| !folder.is_paused);
        Ok(AppSnapshot {
            folders,
            suggestions: self.database.list_suggestions()?,
            history: self.database.list_history()?,
            settings: self.database.settings()?,
            usage: self.usage_snapshot(),
            watcher_active,
            authenticated: self.session().is_ok(),
        })
    }

    fn local_usage(&self) -> Option<UsageSnapshot> {
        let now = Utc::now();
        Some(UsageSnapshot {
            period: now.format("%Y-%m").to_string(),
            used: 0,
            limit: 100,
            reserved: 0,
            resets_at: (now + Duration::days(30)).to_rfc3339(),
        })
    }

    fn usage_snapshot(&self) -> Option<UsageSnapshot> {
        if let Ok(cache) = self.usage_cache.lock() {
            if let Some((created, snapshot)) = cache.as_ref() {
                if created.elapsed() < StdDuration::from_secs(60) {
                    return Some(snapshot.clone());
                }
            }
        }
        let token = self.session().ok()?.access_token;
        let api_url = hosted_api_url();
        let fetched = tauri::async_runtime::block_on(async {
            reqwest::Client::new()
                .get(format!("{api_url}/v1/usage"))
                .bearer_auth(token)
                .send()
                .await
                .ok()?
                .error_for_status()
                .ok()?
                .json::<UsageSnapshot>()
                .await
                .ok()
        });
        if let Some(snapshot) = fetched {
            if let Ok(mut cache) = self.usage_cache.lock() {
                *cache = Some((Instant::now(), snapshot.clone()));
            }
            Some(snapshot)
        } else {
            self.local_usage()
        }
    }

    pub fn add_folder(
        self: &Arc<Self>,
        path: &str,
        preset: PresetId,
        mode: FolderMode,
    ) -> Result<()> {
        if mode == FolderMode::Automatic {
            return Err(AppError::Validation(
                "Automatic se habilita después de 20 decisiones".into(),
            ));
        }
        let path = safety::validate_folder(Path::new(path))?;
        let id = Uuid::new_v4().to_string();
        let display_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let extensions = DEFAULT_EXTENSIONS
            .iter()
            .map(|value| (*value).to_string())
            .collect::<Vec<_>>();
        let stored_id = self.database.add_folder(
            &id,
            &path.to_string_lossy(),
            &display_name,
            preset.as_str(),
            mode.as_str(),
            &extensions,
        )?;
        if let Some(folder) = self.database.folder(&stored_id)? {
            self.watch(&folder)?;
        }
        self.emit_change();
        Ok(())
    }

    fn watch(&self, folder: &WatchedFolder) -> Result<()> {
        let mut guard = self
            .watcher
            .lock()
            .map_err(|_| AppError::Validation("Watcher bloqueado".into()))?;
        if let Some(watcher) = guard.as_mut() {
            let _ = watcher.unwatch(Path::new(&folder.path));
            watcher
                .watch(
                    Path::new(&folder.path),
                    if folder.include_subfolders {
                        RecursiveMode::Recursive
                    } else {
                        RecursiveMode::NonRecursive
                    },
                )
                .map_err(|error| AppError::Io(std::io::Error::other(error.to_string())))?;
        }
        Ok(())
    }

    fn unwatch(&self, path: &Path) -> Result<()> {
        let mut guard = self
            .watcher
            .lock()
            .map_err(|_| AppError::Validation("Watcher bloqueado".into()))?;
        if let Some(watcher) = guard.as_mut() {
            watcher
                .unwatch(path)
                .map_err(|error| AppError::Io(std::io::Error::other(error.to_string())))?;
        }
        Ok(())
    }

    pub fn remove_folder(&self, id: &str) -> Result<()> {
        let folder = self
            .database
            .folder(id)?
            .ok_or_else(|| AppError::Validation("Carpeta no encontrada".into()))?;
        let _ = self.unwatch(Path::new(&folder.path));
        self.database.remove_folder(id)?;
        self.emit_change();
        Ok(())
    }

    pub fn pause_folder(&self, id: &str, minutes: Option<i64>) -> Result<()> {
        let folder = self
            .database
            .folder(id)?
            .ok_or_else(|| AppError::Validation("Carpeta no encontrada".into()))?;
        let until = minutes.map(|minutes| (Utc::now() + Duration::minutes(minutes)).to_rfc3339());
        self.unwatch(Path::new(&folder.path))?;
        self.database.set_pause(id, true, until)?;
        self.emit_change();
        Ok(())
    }

    pub fn resume_folder(&self, id: &str) -> Result<()> {
        self.database.set_pause(id, false, None)?;
        let folder = self
            .database
            .folder(id)?
            .ok_or_else(|| AppError::Validation("Carpeta no encontrada".into()))?;
        self.watch(&folder)?;
        self.emit_change();
        Ok(())
    }

    pub fn set_mode(&self, id: &str, mode: FolderMode) -> Result<()> {
        let folder = self
            .database
            .folder(id)?
            .ok_or_else(|| AppError::Validation("Carpeta no encontrada".into()))?;
        if mode == FolderMode::Automatic && !folder.automatic_eligible {
            return Err(AppError::Validation(
                "Automatic requiere 20 decisiones, 80% sin edición y cero undo reciente".into(),
            ));
        }
        self.database.set_mode(id, mode.as_str())?;
        self.emit_change();
        Ok(())
    }

    pub fn scan_folder(self: &Arc<Self>, id: &str, limit: usize) -> Result<usize> {
        let folder = self
            .database
            .folder(id)?
            .ok_or_else(|| AppError::Validation("Carpeta no encontrada".into()))?;
        let mut count = 0;
        for entry in WalkDir::new(&folder.path)
            .follow_links(false)
            .into_iter()
            .filter_map(std::result::Result::ok)
        {
            if count >= limit.min(100) {
                break;
            }
            if entry.file_type().is_file() && safety::supported(entry.path(), &folder.extensions) {
                self.clone().schedule_path(entry.path().to_path_buf());
                count += 1;
            }
        }
        Ok(count)
    }

    fn schedule_path(self: Arc<Self>, path: PathBuf) {
        std::thread::spawn(move || {
            if let Err(error) = self.process_path(&path) {
                let _ = self.app.emit(
                    "job_updated",
                    json!({"path":path.file_name().unwrap_or_default(),"status":"failed","error":error.to_string()}),
                );
            }
        });
    }

    fn process_path(self: &Arc<Self>, path: &Path) -> Result<()> {
        if !path.is_file() || path.is_symlink() {
            return Ok(());
        }
        let folder = match self.database.folder_for_path(path)? {
            Some(folder) if !folder.is_paused => folder,
            _ => return Ok(()),
        };
        if !safety::supported(path, &folder.extensions) {
            return Ok(());
        }
        safety::wait_until_stable(path)?;
        let content_hash = extract::hash_file(path)?;
        let job_id = Uuid::new_v4().to_string();
        if !self.database.insert_job(
            &job_id,
            &folder.id,
            &path.to_string_lossy(),
            &content_hash,
            "extracting",
        )? {
            return Ok(());
        }
        let extracted = match extract::extract(path) {
            Ok(extracted) => extracted,
            Err(error) => {
                self.database
                    .update_job(&job_id, "failed", Some(&error.to_string()))?;
                return Err(error);
            }
        };
        let settings = self.database.settings()?;
        let preset = parse_preset(&folder.preset)?;
        self.database.update_job(&job_id, "awaiting_ai", None)?;
        let analysis = self.analyze(
            &job_id,
            &preset,
            &settings.output_locale,
            &settings.provider,
            &extracted,
            &path.file_name().unwrap_or_default().to_string_lossy(),
        );
        let analysis = match analysis {
            Ok(result) => result,
            Err(AppError::AuthRequired) => {
                self.database
                    .update_job(&job_id, "waiting_for_auth", None)?;
                return Ok(());
            }
            Err(error) => {
                if settings.provider == "local"
                    || matches!(error, AppError::Offline(_) | AppError::QuotaExceeded)
                {
                    ai::local_fallback(
                        &job_id,
                        &preset,
                        &extracted,
                        &path.file_name().unwrap_or_default().to_string_lossy(),
                    )
                } else {
                    self.database
                        .update_job(&job_id, "failed", Some(&error.to_string()))?;
                    return Err(error);
                }
            }
        };
        let stem = naming::build_stem(
            &preset,
            &analysis.fields,
            extracted.captured_date.as_deref(),
            None,
        );
        if stem.is_empty() {
            self.database.update_job(
                &job_id,
                "ignored",
                Some("No hay evidencia suficiente para mejorar el nombre"),
            )?;
            return Ok(());
        }
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        let filename = naming::sanitize_with_extension(&stem, extension)?;
        let current_name = path.file_name().unwrap_or_default().to_string_lossy();
        if !naming::should_suggest(&current_name, &filename, analysis.confidence) {
            self.database.update_job(
                &job_id,
                "ignored",
                Some("El nombre actual es igual o mejor"),
            )?;
            return Ok(());
        }
        let directory = path
            .parent()
            .ok_or_else(|| AppError::Validation("Archivo sin carpeta".into()))?;
        let (candidate, collision) = naming::collision_free_path(directory, &filename)?;
        let proposed_name = candidate
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let suggestion_id = Uuid::new_v4().to_string();
        let sources = collect_sources(&extracted, &analysis);
        self.database.insert_suggestion(
            &suggestion_id,
            &job_id,
            &folder.id,
            &path.to_string_lossy(),
            &path.file_name().unwrap_or_default().to_string_lossy(),
            &proposed_name,
            &extracted.file_kind,
            extracted.thumbnail_data_url.as_deref(),
            analysis.confidence,
            &explanation(&sources, &analysis),
            &sources,
            collision,
            &content_hash,
            &settings.provider,
        )?;
        self.emit_change();
        if settings.notify_suggestions && folder.mode == "ask" {
            let _ = self
                .app
                .notification()
                .builder()
                .title("Naming Police")
                .body(format!(
                    "{} → {}",
                    path.file_name().unwrap_or_default().to_string_lossy(),
                    proposed_name
                ))
                .show();
        }
        if folder.mode == "automatic"
            && folder.automatic_eligible
            && analysis.confidence >= 0.9
            && !analysis.unsafe_or_sensitive
            && !collision
        {
            self.approve(&suggestion_id, None)?;
        }
        Ok(())
    }

    fn analyze(
        &self,
        request_id: &str,
        preset: &PresetId,
        locale: &str,
        provider: &str,
        extracted: &ExtractedContent,
        current_basename: &str,
    ) -> Result<AnalysisResult> {
        match provider {
            "local" => Ok(ai::local_fallback(
                request_id,
                preset,
                extracted,
                current_basename,
            )),
            "byok" => {
                let key = self.secret("openai_byok")?;
                tauri::async_runtime::block_on(ai::byok(
                    &key,
                    request_id,
                    preset,
                    locale,
                    extracted,
                    current_basename,
                ))
            }
            "hosted" => {
                let Ok(mut token) = self.session().map(|session| session.access_token) else {
                    return Err(AppError::AuthRequired);
                };
                let api_url = hosted_api_url();
                let first = tauri::async_runtime::block_on(ai::hosted(
                    api_url,
                    &token,
                    request_id,
                    preset,
                    locale,
                    extracted,
                    current_basename,
                ));
                if matches!(&first, Err(AppError::Provider(message)) if message.contains("401")) {
                    let Ok(refreshed) = self.refresh_session() else {
                        return Err(AppError::AuthRequired);
                    };
                    token = refreshed;
                    tauri::async_runtime::block_on(ai::hosted(
                        api_url,
                        &token,
                        request_id,
                        preset,
                        locale,
                        extracted,
                        current_basename,
                    ))
                } else {
                    first
                }
            }
            _ => Err(AppError::Validation("Proveedor desconocido".into())),
        }
    }

    fn refresh_session(&self) -> Result<String> {
        let supabase_url = supabase_url()?;
        let anon_key = supabase_anon_key()?;
        let refresh_token = self.session()?.refresh_token;
        let refresh_for_request = refresh_token.clone();
        let response: Value = tauri::async_runtime::block_on(async {
            reqwest::Client::new()
                .post(format!(
                    "{supabase_url}/auth/v1/token?grant_type=refresh_token"
                ))
                .header("apikey", anon_key)
                .json(&json!({"refresh_token":refresh_for_request}))
                .send()
                .await
                .map_err(|error| AppError::Offline(error.to_string()))?
                .error_for_status()
                .map_err(|error| AppError::Secret(error.to_string()))?
                .json()
                .await
                .map_err(|error| AppError::Secret(error.to_string()))
        })?;
        let access_token = response["access_token"]
            .as_str()
            .ok_or_else(|| AppError::Secret("Refresh sin access token".into()))?;
        let next_refresh = response["refresh_token"].as_str().unwrap_or(&refresh_token);
        self.persist_session(&SessionTokens {
            access_token: access_token.into(),
            refresh_token: next_refresh.into(),
        })?;
        Ok(access_token.into())
    }

    pub async fn request_hosted_otp(&self, email: &str) -> Result<()> {
        let email = email.trim().to_lowercase();
        if !email.contains('@') || email.len() > 254 {
            return Err(AppError::Validation("Email inválido".into()));
        }
        let response = reqwest::Client::new()
            .post(format!("{}/auth/v1/otp", supabase_url()?))
            .header("apikey", supabase_anon_key()?)
            .json(&json!({"email":email,"create_user":true}))
            .send()
            .await
            .map_err(|error| AppError::Offline(error.to_string()))?;
        match response.status().as_u16() {
            200..=299 => Ok(()),
            429 => Err(AppError::Provider(
                "Esperá un minuto antes de pedir otro código".into(),
            )),
            status => Err(AppError::Provider(format!(
                "No se pudo enviar el código ({status})"
            ))),
        }
    }

    pub async fn verify_hosted_otp(self: &Arc<Self>, email: &str, code: &str) -> Result<()> {
        let email = email.trim().to_lowercase();
        let code: String = code
            .chars()
            .filter(|character| character.is_ascii_digit())
            .collect();
        if !(6..=8).contains(&code.len()) {
            return Err(AppError::Validation(
                "El código debe tener entre 6 y 8 dígitos".into(),
            ));
        }
        let response = reqwest::Client::new()
            .post(format!("{}/auth/v1/verify", supabase_url()?))
            .header("apikey", supabase_anon_key()?)
            .json(&json!({"email":email,"token":code,"type":"email"}))
            .send()
            .await
            .map_err(|error| AppError::Offline(error.to_string()))?;
        if !response.status().is_success() {
            return Err(match response.status().as_u16() {
                403 => AppError::Validation("Código usado o vencido; pedí uno nuevo".into()),
                429 => AppError::Provider("Demasiados intentos; esperá un minuto".into()),
                status => AppError::Provider(format!("No se pudo validar el código ({status})")),
            });
        }
        let body: Value = response
            .json()
            .await
            .map_err(|error| AppError::Provider(error.to_string()))?;
        let session = SessionTokens {
            access_token: body["access_token"]
                .as_str()
                .ok_or_else(|| AppError::Secret("Respuesta sin access token".into()))?
                .into(),
            refresh_token: body["refresh_token"]
                .as_str()
                .ok_or_else(|| AppError::Secret("Respuesta sin refresh token".into()))?
                .into(),
        };
        *self
            .pending_session
            .lock()
            .map_err(|_| AppError::Secret("Sesión temporal bloqueada".into()))? =
            Some(session.clone());
        self.persist_session(&session)?;
        *self
            .pending_session
            .lock()
            .map_err(|_| AppError::Secret("Sesión temporal bloqueada".into()))? = None;
        for path in self.database.requeue_waiting_for_auth()? {
            self.clone().schedule_path(PathBuf::from(path));
        }
        Ok(())
    }

    pub fn retry_store_hosted_session(self: &Arc<Self>) -> Result<()> {
        let session = self
            .pending_session
            .lock()
            .map_err(|_| AppError::Secret("Sesión temporal bloqueada".into()))?
            .clone()
            .ok_or_else(|| {
                AppError::Validation("No hay una sesión pendiente para guardar".into())
            })?;
        self.persist_session(&session)?;
        *self
            .pending_session
            .lock()
            .map_err(|_| AppError::Secret("Sesión temporal bloqueada".into()))? = None;
        for path in self.database.requeue_waiting_for_auth()? {
            self.clone().schedule_path(PathBuf::from(path));
        }
        Ok(())
    }

    pub fn persist_session(&self, session: &SessionTokens) -> Result<()> {
        if session.access_token.len() < 20 || session.refresh_token.len() < 20 {
            return Err(AppError::Validation("Sesión inválida".into()));
        }
        let encoded = serde_json::to_string(session)?;
        self.store_secret(SESSION_ACCOUNT, &encoded)?;
        if self.secret(SESSION_ACCOUNT)? != encoded {
            let _ = self.delete_secret(SESSION_ACCOUNT);
            return Err(AppError::Secret(
                "Credential Manager no confirmó la sesión".into(),
            ));
        }
        let _ = self.delete_secret("access_token");
        let _ = self.delete_secret("refresh_token");
        Ok(())
    }

    pub fn clear_session(&self) -> Result<()> {
        self.delete_secret(SESSION_ACCOUNT)?;
        let _ = self.delete_secret("access_token");
        let _ = self.delete_secret("refresh_token");
        if let Ok(mut pending) = self.pending_session.lock() {
            *pending = None;
        }
        Ok(())
    }

    fn session(&self) -> Result<SessionTokens> {
        if let Ok(encoded) = self.secret(SESSION_ACCOUNT) {
            return serde_json::from_str(&encoded).map_err(AppError::from);
        }
        let legacy = SessionTokens {
            access_token: self.secret("access_token")?,
            refresh_token: self.secret("refresh_token")?,
        };
        let _ = self.persist_session(&legacy);
        Ok(legacy)
    }

    pub fn approve(&self, id: &str, edited_name: Option<String>) -> Result<()> {
        let suggestion = self.database.suggestion_record(id)?;
        let source = PathBuf::from(&suggestion.path);
        if !source.exists() {
            return Err(AppError::FileChanged(
                "El archivo fue movido o eliminado".into(),
            ));
        }
        if extract::hash_file(&source)? != suggestion.content_hash {
            return Err(AppError::FileChanged(
                "El contenido cambió desde la sugerencia".into(),
            ));
        }
        let extension = source
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        let desired = naming::sanitize_with_extension(
            edited_name.as_deref().unwrap_or(&suggestion.proposed_name),
            extension,
        )?;
        let (destination, _) = naming::collision_free_path(
            source
                .parent()
                .ok_or_else(|| AppError::Validation("Archivo sin carpeta".into()))?,
            &desired,
        )?;
        let operation_id = Uuid::new_v4().to_string();
        self.database.plan_operation(
            &operation_id,
            Some(id),
            &suggestion.folder_id,
            &source.to_string_lossy(),
            &destination.to_string_lossy(),
            &suggestion.content_hash,
            "rename",
            None,
        )?;
        if let Err(error) = exclusive_move(&source, &destination) {
            self.database
                .operation_status(&operation_id, "failed", Some(&error.to_string()))?;
            return Err(error);
        }
        self.database
            .operation_status(&operation_id, "fs_done", None)?;
        self.database
            .decide_suggestion(id, "renamed", edited_name.is_some())?;
        self.database
            .operation_status(&operation_id, "committed", None)?;
        self.emit_change();
        Ok(())
    }

    pub fn ignore(&self, id: &str) -> Result<()> {
        self.database.decide_suggestion(id, "ignored", false)?;
        self.emit_change();
        Ok(())
    }

    pub fn undo(&self, id: &str) -> Result<()> {
        let (folder_id, old_path, current_path, expected_hash, parent_id) =
            self.database.operation_for_undo(id)?;
        let source = PathBuf::from(current_path);
        let destination = PathBuf::from(old_path);
        if destination.exists() {
            return Err(AppError::Conflict(
                "El nombre original ahora está ocupado".into(),
            ));
        }
        if !source.exists() {
            return Err(AppError::FileChanged(
                "El archivo fue movido o eliminado".into(),
            ));
        }
        if extract::hash_file(&source)? != expected_hash {
            return Err(AppError::FileChanged(
                "El archivo fue modificado externamente; undo cancelado".into(),
            ));
        }
        let operation_id = Uuid::new_v4().to_string();
        self.database.plan_operation(
            &operation_id,
            None,
            &folder_id,
            &source.to_string_lossy(),
            &destination.to_string_lossy(),
            &expected_hash,
            "undo",
            Some(&parent_id),
        )?;
        if let Err(error) = exclusive_move(&source, &destination) {
            self.database
                .operation_status(&operation_id, "failed", Some(&error.to_string()))?;
            return Err(error);
        }
        self.database
            .operation_status(&operation_id, "committed", None)?;
        self.database.mark_undo_trust(&folder_id)?;
        self.emit_change();
        Ok(())
    }

    pub fn preview_payload(&self, id: &str) -> Result<Value> {
        let suggestion = self.database.suggestion_record(id)?;
        let path = Path::new(&suggestion.path);
        Ok(json!({
            "schema_version":"2",
            "request_id":"<opaque>",
            "current_basename":path.file_name().unwrap_or_default().to_string_lossy(),
            "media_kind":if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("pdf")) {"document"} else {"image"},
            "content":"Miniatura JPEG sin EXIF o texto extraído, máximo 20.000 caracteres",
            "metadata":["mime_type","captured_at","GPS reducido si existe"],
            "excluded":["ruta local","nombre de usuario","nombre de carpeta","archivo original"]
        }))
    }

    pub fn export_config(&self) -> Result<String> {
        let settings = self.database.settings()?;
        let folders = self.database.list_folders()?;
        Ok(serde_json::to_string_pretty(&json!({
            "schema_version":"1",
            "locale":settings.locale,
            "output_locale":settings.output_locale,
            "remote_ai_enabled":settings.remote_ai_enabled,
            "provider":settings.provider,
            "folders":folders.into_iter().map(|folder| json!({
                "path":folder.path,
                "preset":folder.preset,
                "mode":if folder.mode=="automatic" {"ask"} else {&folder.mode},
                "include_subfolders":folder.include_subfolders,
                "extensions":folder.extensions
            })).collect::<Vec<_>>()
        }))?)
    }

    pub fn import_config(self: &Arc<Self>, value: &str) -> Result<()> {
        let config: Value = serde_json::from_str(value)?;
        if config["schema_version"] != "1" {
            return Err(AppError::Validation(
                "Versión de configuración no soportada".into(),
            ));
        }
        if let Some(locale) = config["locale"].as_str() {
            if ["es", "en"].contains(&locale) {
                self.database
                    .set_setting("locale", &json!(locale).to_string())?;
            }
        }
        if let Some(locale) = config["output_locale"].as_str() {
            if ["es", "en"].contains(&locale) {
                self.database
                    .set_setting("output_locale", &json!(locale).to_string())?;
            }
        }
        self.emit_change();
        Ok(())
    }

    pub fn store_secret(&self, account: &str, value: &str) -> Result<()> {
        Entry::new(KEYRING_SERVICE, account)
            .map_err(|error| AppError::Secret(error.to_string()))?
            .set_password(value)
            .map_err(|error| AppError::Secret(error.to_string()))
    }

    pub fn delete_secret(&self, account: &str) -> Result<()> {
        let entry = Entry::new(KEYRING_SERVICE, account)
            .map_err(|error| AppError::Secret(error.to_string()))?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(AppError::Secret(error.to_string())),
        }
    }

    fn secret(&self, account: &str) -> Result<String> {
        Entry::new(KEYRING_SERVICE, account)
            .map_err(|error| AppError::Secret(error.to_string()))?
            .get_password()
            .map_err(|_| AppError::Secret(format!("Falta secreto: {account}")))
    }

    fn recover_operations(&self) -> Result<()> {
        for (id, old_path, new_path) in self.database.recover_incomplete_operations()? {
            let old_exists = Path::new(&old_path).exists();
            let new_exists = Path::new(&new_path).exists();
            match (old_exists, new_exists) {
                (false, true) => self.database.operation_status(&id, "committed", None)?,
                (true, false) => self.database.operation_status(
                    &id,
                    "failed",
                    Some("Recuperado: filesystem no cambió"),
                )?,
                _ => self.database.operation_status(
                    &id,
                    "failed",
                    Some("Recuperación ambigua; revisión manual requerida"),
                )?,
            }
        }
        Ok(())
    }

    fn emit_change(&self) {
        let _ = self.app.emit("app_state_changed", ());
    }
}

fn parse_preset(value: &str) -> Result<PresetId> {
    match value {
        "general" => Ok(PresetId::General),
        "screenshots" => Ok(PresetId::Screenshots),
        "travel_photos" => Ok(PresetId::TravelPhotos),
        "invoices" => Ok(PresetId::Invoices),
        "custom" => Ok(PresetId::Custom),
        _ => Err(AppError::Validation("Preset desconocido".into())),
    }
}

fn collect_sources(extracted: &ExtractedContent, analysis: &AnalysisResult) -> Vec<String> {
    let mut sources = extracted.sources.clone();
    if analysis.model != "local-rules-v2" {
        sources.push("ai".into());
    }
    sources.sort();
    sources.dedup();
    sources
}

fn explanation(sources: &[String], analysis: &AnalysisResult) -> String {
    format!(
        "Campos construidos localmente desde {}. Modelo: {}.",
        sources.join(", "),
        analysis.model
    )
}

fn exclusive_move(source: &Path, destination: &Path) -> Result<()> {
    if destination.exists() {
        return Err(AppError::Conflict("El destino ya existe".into()));
    }
    std::fs::hard_link(source, destination).map_err(|error| {
        if error.kind() == std::io::ErrorKind::AlreadyExists {
            AppError::Conflict("El destino apareció durante el rename".into())
        } else {
            AppError::Io(error)
        }
    })?;
    if let Err(error) = std::fs::remove_file(source) {
        let _ = std::fs::remove_file(destination);
        return Err(AppError::Io(error));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn exclusive_move_never_overwrites() {
        let directory = tempdir().unwrap();
        let source = directory.path().join("source.txt");
        let destination = directory.path().join("destination.txt");
        std::fs::write(&source, b"source").unwrap();
        std::fs::write(&destination, b"destination").unwrap();
        assert!(matches!(
            exclusive_move(&source, &destination),
            Err(AppError::Conflict(_))
        ));
        assert_eq!(std::fs::read(&source).unwrap(), b"source");
        assert_eq!(std::fs::read(&destination).unwrap(), b"destination");
    }
}
