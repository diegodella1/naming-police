use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
};

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    error::{AppError, Result},
    models::{AppSettings, HistoryEntry, Suggestion, SuggestionRecord, Trust, WatchedFolder},
};

pub struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA temp_store = MEMORY;",
        )?;
        let database = Self {
            connection: Mutex::new(connection),
        };
        database.migrate()?;
        database.secure_file(path)?;
        Ok(database)
    }

    fn conn(&self) -> Result<MutexGuard<'_, Connection>> {
        self.connection
            .lock()
            .map_err(|_| AppError::Database(rusqlite::Error::InvalidQuery))
    }

    fn migrate(&self) -> Result<()> {
        let mut connection = self.conn()?;
        let transaction = connection.transaction()?;
        transaction.execute_batch(include_str!("../migrations/0001_initial.sql"))?;
        transaction.execute(
            "INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(1,?1,?2)",
            params!["initial", Utc::now().to_rfc3339()],
        )?;
        let has_v2: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2)",
            [],
            |row| row.get(0),
        )?;
        if !has_v2 {
            transaction
                .execute_batch(include_str!("../migrations/0002_soft_delete_folders.sql"))?;
            transaction.execute(
                "INSERT INTO schema_migrations(version,name,applied_at) VALUES(2,?1,?2)",
                params!["soft_delete_folders", Utc::now().to_rfc3339()],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    #[cfg(unix)]
    fn secure_file(&self, path: &Path) -> Result<()> {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))?;
        Ok(())
    }

    #[cfg(not(unix))]
    fn secure_file(&self, _path: &Path) -> Result<()> {
        Ok(())
    }

    pub fn list_folders(&self) -> Result<Vec<WatchedFolder>> {
        let connection = self.conn()?;
        let mut statement = connection.prepare(
            "SELECT f.id,f.path,f.display_name,f.preset,f.mode,f.is_paused,f.pause_until,
                    f.include_subfolders,f.extensions_json,f.decisions,f.accepted_unchanged,
                    f.recent_undos,
                    (SELECT COUNT(*) FROM suggestions s WHERE s.folder_id=f.id AND s.status='suggested')
             FROM watched_folders f WHERE f.is_removed=0 ORDER BY f.created_at",
        )?;
        let rows = statement.query_map([], |row| {
            let extensions: String = row.get(8)?;
            let decisions: i64 = row.get(9)?;
            let accepted_unchanged: i64 = row.get(10)?;
            let recent_undos: i64 = row.get(11)?;
            let automatic_eligible =
                decisions >= 20 && accepted_unchanged * 100 >= decisions * 80 && recent_undos == 0;
            Ok(WatchedFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                display_name: row.get(2)?,
                preset: row.get(3)?,
                mode: row.get(4)?,
                is_paused: row.get::<_, i64>(5)? != 0,
                pause_until: row.get(6)?,
                include_subfolders: row.get::<_, i64>(7)? != 0,
                extensions: serde_json::from_str(&extensions).unwrap_or_default(),
                pending_count: row.get(12)?,
                automatic_eligible,
                trust: Trust {
                    decisions,
                    accepted_unchanged,
                    recent_undos,
                },
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn add_folder(
        &self,
        id: &str,
        path: &str,
        display_name: &str,
        preset: &str,
        mode: &str,
        extensions: &[String],
    ) -> Result<()> {
        self.conn()?.execute(
            "INSERT INTO watched_folders(
                id,path,display_name,preset,mode,extensions_json,created_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7)",
            params![
                id,
                path,
                display_name,
                preset,
                mode,
                serde_json::to_string(extensions)?,
                Utc::now().to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn remove_folder(&self, id: &str) -> Result<()> {
        self.conn()?.execute(
            "UPDATE watched_folders SET is_removed=1,is_paused=1 WHERE id=?1",
            [id],
        )?;
        Ok(())
    }

    pub fn folder(&self, id: &str) -> Result<Option<WatchedFolder>> {
        Ok(self
            .list_folders()?
            .into_iter()
            .find(|folder| folder.id == id))
    }

    pub fn folder_for_path(&self, path: &Path) -> Result<Option<WatchedFolder>> {
        let canonical = path.to_string_lossy();
        Ok(self
            .list_folders()?
            .into_iter()
            .filter(|folder| canonical.starts_with(&folder.path))
            .max_by_key(|folder| folder.path.len()))
    }

    pub fn set_pause(&self, id: &str, paused: bool, until: Option<String>) -> Result<()> {
        self.conn()?.execute(
            "UPDATE watched_folders SET is_paused=?1,pause_until=?2 WHERE id=?3",
            params![paused as i64, until, id],
        )?;
        Ok(())
    }

    pub fn set_mode(&self, id: &str, mode: &str) -> Result<()> {
        self.conn()?.execute(
            "UPDATE watched_folders SET mode=?1 WHERE id=?2",
            params![mode, id],
        )?;
        Ok(())
    }

    pub fn settings(&self) -> Result<AppSettings> {
        let connection = self.conn()?;
        let mut settings = AppSettings::default();
        let mut statement = connection.prepare("SELECT key,value FROM settings")?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "locale" => {
                    settings.locale = serde_json::from_str(&value).unwrap_or(settings.locale)
                }
                "output_locale" => {
                    settings.output_locale =
                        serde_json::from_str(&value).unwrap_or(settings.output_locale)
                }
                "remote_ai_enabled" => {
                    settings.remote_ai_enabled =
                        serde_json::from_str(&value).unwrap_or(settings.remote_ai_enabled)
                }
                "provider" => {
                    settings.provider = serde_json::from_str(&value).unwrap_or(settings.provider)
                }
                "notify_suggestions" => {
                    settings.notify_suggestions =
                        serde_json::from_str(&value).unwrap_or(settings.notify_suggestions)
                }
                "auto_updates" => {
                    settings.auto_updates =
                        serde_json::from_str(&value).unwrap_or(settings.auto_updates)
                }
                "onboarding_complete" => {
                    settings.onboarding_complete =
                        serde_json::from_str(&value).unwrap_or(settings.onboarding_complete)
                }
                _ => {}
            }
        }
        Ok(settings)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        const ALLOWED: &[&str] = &[
            "locale",
            "output_locale",
            "remote_ai_enabled",
            "provider",
            "notify_suggestions",
            "auto_updates",
            "onboarding_complete",
        ];
        if !ALLOWED.contains(&key) {
            return Err(AppError::Validation("Ajuste desconocido".into()));
        }
        let _: serde_json::Value = serde_json::from_str(value)?;
        self.conn()?.execute(
            "INSERT INTO settings(key,value,updated_at) VALUES(?1,?2,?3)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
            params![key, value, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn insert_job(
        &self,
        id: &str,
        folder_id: &str,
        path: &str,
        content_hash: &str,
        status: &str,
    ) -> Result<bool> {
        let changed = self.conn()?.execute(
            "INSERT OR IGNORE INTO jobs(
                id,folder_id,path,content_hash,status,created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?6)",
            params![
                id,
                folder_id,
                path,
                content_hash,
                status,
                Utc::now().to_rfc3339()
            ],
        )?;
        Ok(changed == 1)
    }

    pub fn update_job(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        self.conn()?.execute(
            "UPDATE jobs SET status=?1,error_detail=?2,updated_at=?3 WHERE id=?4",
            params![status, error, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn insert_suggestion(
        &self,
        id: &str,
        job_id: &str,
        folder_id: &str,
        path: &str,
        current_name: &str,
        proposed_name: &str,
        file_kind: &str,
        thumbnail: Option<&str>,
        confidence: f64,
        explanation: &str,
        sources: &[String],
        collision: bool,
        content_hash: &str,
        provider: &str,
    ) -> Result<()> {
        self.conn()?.execute(
            "INSERT INTO suggestions(
                id,job_id,folder_id,path,current_name,proposed_name,file_kind,
                thumbnail_data_url,confidence,explanation,sources_json,collision,status,
                content_hash,provider,created_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'suggested',?13,?14,?15)",
            params![
                id,
                job_id,
                folder_id,
                path,
                current_name,
                proposed_name,
                file_kind,
                thumbnail,
                confidence,
                explanation,
                serde_json::to_string(sources)?,
                collision as i64,
                content_hash,
                provider,
                Utc::now().to_rfc3339()
            ],
        )?;
        self.update_job(job_id, "suggested", None)
    }

    pub fn list_suggestions(&self) -> Result<Vec<Suggestion>> {
        let connection = self.conn()?;
        let mut statement = connection.prepare(
            "SELECT s.id,s.job_id,s.current_name,s.proposed_name,f.display_name,s.file_kind,
                    s.thumbnail_data_url,s.confidence,s.explanation,s.sources_json,s.status,
                    s.created_at,s.collision
             FROM suggestions s JOIN watched_folders f ON f.id=s.folder_id
             WHERE s.status='suggested' ORDER BY s.created_at DESC",
        )?;
        let rows = statement.query_map([], |row| {
            let confidence: f64 = row.get(7)?;
            let sources_json: String = row.get(9)?;
            Ok(Suggestion {
                id: row.get(0)?,
                job_id: row.get(1)?,
                current_name: row.get(2)?,
                proposed_name: row.get(3)?,
                folder_name: row.get(4)?,
                file_kind: row.get(5)?,
                thumbnail_data_url: row.get(6)?,
                confidence,
                confidence_band: if confidence >= 0.9 {
                    "high"
                } else if confidence >= 0.65 {
                    "medium"
                } else {
                    "low"
                }
                .into(),
                explanation: row.get(8)?,
                sources: serde_json::from_str(&sources_json).unwrap_or_default(),
                status: row.get(10)?,
                created_at: row.get(11)?,
                collision: row.get::<_, i64>(12)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn suggestion_record(&self, id: &str) -> Result<SuggestionRecord> {
        self.conn()?
            .query_row(
                "SELECT folder_id,path,proposed_name,content_hash
                 FROM suggestions WHERE id=?1 AND status='suggested'",
                [id],
                |row| {
                    Ok(SuggestionRecord {
                        folder_id: row.get(0)?,
                        path: row.get(1)?,
                        proposed_name: row.get(2)?,
                        content_hash: row.get(3)?,
                    })
                },
            )
            .optional()?
            .ok_or_else(|| AppError::Validation("Sugerencia no encontrada".into()))
    }

    pub fn decide_suggestion(&self, id: &str, status: &str, edited: bool) -> Result<()> {
        let connection = self.conn()?;
        connection.execute(
            "UPDATE suggestions SET status=?1,decided_at=?2 WHERE id=?3",
            params![status, Utc::now().to_rfc3339(), id],
        )?;
        if status == "renamed" {
            connection.execute(
                "UPDATE watched_folders SET decisions=decisions+1,
                    accepted_unchanged=accepted_unchanged+?1
                 WHERE id=(SELECT folder_id FROM suggestions WHERE id=?2)",
                params![(!edited) as i64, id],
            )?;
        } else if status == "ignored" {
            connection.execute(
                "UPDATE watched_folders SET decisions=decisions+1
                 WHERE id=(SELECT folder_id FROM suggestions WHERE id=?1)",
                [id],
            )?;
        }
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn plan_operation(
        &self,
        id: &str,
        suggestion_id: Option<&str>,
        folder_id: &str,
        old_path: &str,
        new_path: &str,
        content_hash: &str,
        action: &str,
        parent: Option<&str>,
    ) -> Result<()> {
        self.conn()?.execute(
            "INSERT INTO operations(
                id,suggestion_id,folder_id,old_path,new_path,content_hash,action,status,
                parent_operation_id,created_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,'planned',?8,?9)",
            params![
                id,
                suggestion_id,
                folder_id,
                old_path,
                new_path,
                content_hash,
                action,
                parent,
                Utc::now().to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn operation_status(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        self.conn()?.execute(
            "UPDATE operations SET status=?1,error=?2,
                committed_at=CASE WHEN ?1='committed' THEN ?3 ELSE committed_at END
             WHERE id=?4",
            params![status, error, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    pub fn operation_for_undo(&self, id: &str) -> Result<(String, String, String, String, String)> {
        self.conn()?
            .query_row(
                "SELECT folder_id,old_path,new_path,content_hash,id FROM operations
                 WHERE id=?1 AND action='rename' AND status='committed'
                 AND NOT EXISTS(
                    SELECT 1 FROM operations u WHERE u.parent_operation_id=operations.id
                    AND u.action='undo' AND u.status='committed'
                 )",
                [id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                    ))
                },
            )
            .optional()?
            .ok_or_else(|| AppError::Validation("Operación no admite undo".into()))
    }

    pub fn list_history(&self) -> Result<Vec<HistoryEntry>> {
        let connection = self.conn()?;
        let mut statement = connection.prepare(
            "SELECT o.id,o.old_path,o.new_path,f.display_name,o.action,o.status,o.created_at,
                    o.error,
                    CASE WHEN o.action='rename' AND o.status='committed'
                     AND NOT EXISTS(SELECT 1 FROM operations u WHERE u.parent_operation_id=o.id
                       AND u.action='undo' AND u.status='committed')
                    THEN 1 ELSE 0 END
             FROM operations o JOIN watched_folders f ON f.id=o.folder_id
             ORDER BY o.created_at DESC LIMIT 500",
        )?;
        let rows = statement.query_map([], |row| {
            let old_path: String = row.get(1)?;
            let new_path: String = row.get(2)?;
            Ok(HistoryEntry {
                id: row.get(0)?,
                old_name: Path::new(&old_path)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into(),
                new_name: Path::new(&new_path)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into(),
                folder_name: row.get(3)?,
                action: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                error: row.get(7)?,
                can_undo: row.get::<_, i64>(8)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn mark_undo_trust(&self, folder_id: &str) -> Result<()> {
        self.conn()?.execute(
            "UPDATE watched_folders SET recent_undos=recent_undos+1 WHERE id=?1",
            [folder_id],
        )?;
        Ok(())
    }

    pub fn clear_history(&self) -> Result<()> {
        let mut connection = self.conn()?;
        let transaction = connection.transaction()?;
        transaction.execute("UPDATE operations SET parent_operation_id=NULL", [])?;
        transaction.execute(
            "DELETE FROM operations WHERE status IN ('committed','failed')",
            [],
        )?;
        transaction.execute(
            "DELETE FROM suggestions WHERE status IN ('renamed','ignored','undone','failed')",
            [],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn recover_incomplete_operations(&self) -> Result<Vec<(String, String, String)>> {
        let connection = self.conn()?;
        let mut statement = connection.prepare(
            "SELECT id,old_path,new_path FROM operations WHERE status IN ('planned','fs_done')",
        )?;
        let rows = statement.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn migrates_and_soft_deletes_folder_without_losing_record() {
        let directory = tempdir().unwrap();
        let database = Database::open(&directory.path().join("test.db")).unwrap();
        database
            .add_folder(
                "folder-1",
                "/tmp/downloads",
                "Downloads",
                "general",
                "ask",
                &["pdf".into()],
            )
            .unwrap();
        assert_eq!(database.list_folders().unwrap().len(), 1);
        database.remove_folder("folder-1").unwrap();
        assert!(database.list_folders().unwrap().is_empty());
        let count: i64 = database
            .conn()
            .unwrap()
            .query_row(
                "SELECT COUNT(*) FROM watched_folders WHERE id=?1 AND is_removed=1",
                ["folder-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }
}
