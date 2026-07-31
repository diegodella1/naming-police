use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Entrada inválida: {0}")]
    Validation(String),
    #[error("Carpeta no permitida: {0}")]
    UnsafeFolder(String),
    #[error("Archivo no soportado: {0}")]
    Unsupported(String),
    #[error("Conflicto de archivo: {0}")]
    Conflict(String),
    #[error("El archivo cambió externamente: {0}")]
    FileChanged(String),
    #[error("Sin conexión: {0}")]
    Offline(String),
    #[error("Cuota agotada")]
    QuotaExceeded,
    #[error("Hosted AI necesita iniciar sesión")]
    AuthRequired,
    #[error("Proveedor de IA no disponible: {0}")]
    Provider(String),
    #[error("Operación de sistema falló")]
    Io(#[from] std::io::Error),
    #[error("Persistencia local falló")]
    Database(#[from] rusqlite::Error),
    #[error("Datos internos inválidos")]
    Json(#[from] serde_json::Error),
    #[error("Operación segura falló: {0}")]
    Secret(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
