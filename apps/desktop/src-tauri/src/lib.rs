mod ai;
mod core;
mod database;
mod error;
mod extract;
mod models;
mod naming;
mod safety;

use std::sync::Arc;

use core::Core;
use error::Result;
use models::{AppSnapshot, FolderMode, PresetId};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn get_app_snapshot(core: State<'_, Arc<Core>>) -> Result<AppSnapshot> {
    core.snapshot()
}

#[tauri::command]
fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>> {
    let selected = app.dialog().file().blocking_pick_folder();
    selected
        .map(|path| {
            path.into_path()
                .map(|path| path.to_string_lossy().to_string())
                .map_err(|error| error::AppError::Validation(error.to_string()))
        })
        .transpose()
}

#[tauri::command]
fn add_watched_folder(
    core: State<'_, Arc<Core>>,
    path: String,
    preset: PresetId,
    mode: FolderMode,
) -> Result<()> {
    core.inner().add_folder(&path, preset, mode)
}

#[tauri::command]
fn remove_watched_folder(core: State<'_, Arc<Core>>, id: String) -> Result<()> {
    core.remove_folder(&id)
}

#[tauri::command]
fn pause_watched_folder(
    core: State<'_, Arc<Core>>,
    id: String,
    minutes: Option<i64>,
) -> Result<()> {
    core.pause_folder(&id, minutes)
}

#[tauri::command]
fn resume_watched_folder(core: State<'_, Arc<Core>>, id: String) -> Result<()> {
    core.resume_folder(&id)
}

#[tauri::command]
fn set_folder_mode(core: State<'_, Arc<Core>>, id: String, mode: FolderMode) -> Result<()> {
    core.set_mode(&id, mode)
}

#[tauri::command]
fn scan_folder(core: State<'_, Arc<Core>>, id: String, limit: usize) -> Result<usize> {
    core.inner().scan_folder(&id, limit)
}

#[tauri::command]
fn approve_suggestion(
    core: State<'_, Arc<Core>>,
    id: String,
    edited_name: Option<String>,
) -> Result<()> {
    core.approve(&id, edited_name)
}

#[tauri::command]
fn ignore_suggestion(core: State<'_, Arc<Core>>, id: String) -> Result<()> {
    core.ignore(&id)
}

#[tauri::command]
fn undo_operation(core: State<'_, Arc<Core>>, id: String) -> Result<()> {
    core.undo(&id)
}

#[tauri::command]
fn set_setting(core: State<'_, Arc<Core>>, key: String, value: String) -> Result<()> {
    core.database.set_setting(&key, &value)
}

#[tauri::command]
fn finish_onboarding(core: State<'_, Arc<Core>>) -> Result<()> {
    core.database.set_setting("onboarding_complete", "true")
}

#[tauri::command]
fn store_byok_key(core: State<'_, Arc<Core>>, api_key: String) -> Result<()> {
    if !api_key.starts_with("sk-") || api_key.len() < 20 {
        return Err(error::AppError::Validation(
            "La API key de OpenAI no parece válida".into(),
        ));
    }
    core.store_secret("openai_byok", &api_key)
}

#[tauri::command]
fn delete_byok_key(core: State<'_, Arc<Core>>) -> Result<()> {
    core.delete_secret("openai_byok")
}

#[tauri::command]
fn preview_remote_payload(
    core: State<'_, Arc<Core>>,
    suggestion_id: String,
) -> Result<serde_json::Value> {
    core.preview_payload(&suggestion_id)
}

#[tauri::command]
fn export_config(core: State<'_, Arc<Core>>) -> Result<String> {
    core.export_config()
}

#[tauri::command]
fn import_config(core: State<'_, Arc<Core>>, value: String) -> Result<()> {
    core.inner().import_config(&value)
}

#[tauri::command]
fn clear_history(core: State<'_, Arc<Core>>) -> Result<()> {
    core.database.clear_history()
}

#[tauri::command]
fn store_session(
    core: State<'_, Arc<Core>>,
    access_token: String,
    refresh_token: String,
) -> Result<()> {
    if access_token.len() < 20 || refresh_token.len() < 20 {
        return Err(error::AppError::Validation("Sesión inválida".into()));
    }
    core.store_secret("access_token", &access_token)?;
    core.store_secret("refresh_token", &refresh_token)
}

#[tauri::command]
fn sign_out(core: State<'_, Arc<Core>>) -> Result<()> {
    core.delete_secret("access_token")?;
    core.delete_secret("refresh_token")
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let database_path = app
                .path()
                .app_local_data_dir()
                .map_err(|error| error.to_string())?
                .join("naming-police.db");
            let database =
                database::Database::open(&database_path).map_err(|error| error.to_string())?;
            let core = Core::new(database, app.handle().clone());
            core.initialize().map_err(|error| error.to_string())?;
            app.manage(core);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_snapshot,
            pick_folder,
            add_watched_folder,
            remove_watched_folder,
            pause_watched_folder,
            resume_watched_folder,
            set_folder_mode,
            scan_folder,
            approve_suggestion,
            ignore_suggestion,
            undo_operation,
            set_setting,
            finish_onboarding,
            store_byok_key,
            delete_byok_key,
            preview_remote_payload,
            export_config,
            import_config,
            clear_history,
            store_session,
            sign_out,
        ])
        .run(tauri::generate_context!())
        .expect("Naming Police failed to start");
}
