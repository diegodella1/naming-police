use std::{
    path::{Path, PathBuf},
    thread,
    time::Duration,
};

use crate::error::{AppError, Result};

const PROJECT_MARKERS: &[&str] = &[
    ".git",
    "node_modules",
    "Cargo.toml",
    "package.json",
    "*.xcodeproj",
    "*.prproj",
    "*.aep",
    "*.blend",
    "*.fcpxlibrary",
    "*.photoslibrary",
];

pub fn validate_folder(path: &Path) -> Result<PathBuf> {
    let canonical = path
        .canonicalize()
        .map_err(|_| AppError::Validation("La carpeta no existe".into()))?;
    if !canonical.is_dir() {
        return Err(AppError::Validation("La ruta no es una carpeta".into()));
    }
    if canonical.parent().is_none() {
        return Err(AppError::UnsafeFolder(
            "No se puede vigilar una raíz".into(),
        ));
    }
    let normalized = canonical.to_string_lossy().to_ascii_lowercase();
    let blocked_fragments = if cfg!(target_os = "windows") {
        vec![
            "\\windows",
            "\\program files",
            "\\programdata",
            "\\appdata",
            "\\$recycle.bin",
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            "/system",
            "/library",
            "/applications",
            ".app/contents",
            ".photoslibrary",
            "/private/var",
        ]
    } else {
        vec!["/proc", "/sys", "/dev", "/usr", "/etc", "/var/cache"]
    };
    if blocked_fragments.iter().any(|fragment| {
        normalized == *fragment
            || normalized.starts_with(&format!("{fragment}/"))
            || normalized.contains(fragment)
    }) {
        return Err(AppError::UnsafeFolder(
            "Carpeta de sistema, aplicación o biblioteca administrada".into(),
        ));
    }
    if is_network_path(&canonical) {
        return Err(AppError::UnsafeFolder(
            "Unidades de red no están soportadas".into(),
        ));
    }
    for marker in PROJECT_MARKERS {
        if let Some(suffix) = marker.strip_prefix('*') {
            if std::fs::read_dir(&canonical)
                .ok()
                .into_iter()
                .flatten()
                .flatten()
                .any(|entry| {
                    entry
                        .path()
                        .to_string_lossy()
                        .to_ascii_lowercase()
                        .ends_with(suffix)
                })
            {
                return Err(AppError::UnsafeFolder(format!(
                    "Proyecto creativo detectado ({marker})"
                )));
            }
        } else if canonical.join(marker).exists() {
            return Err(AppError::UnsafeFolder(format!(
                "Repositorio o proyecto detectado ({marker})"
            )));
        }
    }
    Ok(canonical)
}

#[cfg(target_os = "windows")]
fn is_network_path(path: &Path) -> bool {
    use std::path::Prefix;

    matches!(
        path.components().next(),
        Some(std::path::Component::Prefix(prefix))
            if matches!(
                prefix.kind(),
                Prefix::UNC(_, _) | Prefix::VerbatimUNC(_, _) | Prefix::DeviceNS(_)
            )
    )
}

#[cfg(not(target_os = "windows"))]
fn is_network_path(path: &Path) -> bool {
    let normalized = path.to_string_lossy();
    normalized.starts_with("//")
}

pub fn wait_until_stable(path: &Path) -> Result<()> {
    let mut previous = None;
    let mut stable_samples = 0;
    for _ in 0..60 {
        let metadata = match path.metadata() {
            Ok(metadata) if metadata.is_file() => metadata,
            Ok(_) => return Err(AppError::Unsupported("No es un archivo regular".into())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Err(AppError::FileChanged("El archivo desapareció".into()))
            }
            Err(error) => return Err(error.into()),
        };
        let modified = metadata.modified().ok();
        let sample = (metadata.len(), modified);
        if previous == Some(sample) {
            stable_samples += 1;
            if stable_samples >= 3 {
                return Ok(());
            }
        } else {
            previous = Some(sample);
            stable_samples = 0;
        }
        thread::sleep(Duration::from_secs(1));
    }
    Err(AppError::FileChanged(
        "El archivo continúa escribiéndose después de 60 segundos".into(),
    ))
}

pub fn supported(path: &Path, extensions: &[String]) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            extensions
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(extension))
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_check_is_case_insensitive() {
        assert!(supported(
            Path::new("/tmp/image.JPEG"),
            &["jpg".into(), "jpeg".into()]
        ));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_local_verbatim_paths_are_not_network_paths() {
        assert!(!is_network_path(Path::new(r"\\?\C:\Users\Diego\Downloads")));
        assert!(!is_network_path(Path::new(r"C:\Users\Diego\Downloads")));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_unc_paths_are_network_paths() {
        assert!(is_network_path(Path::new(r"\\server\share\files")));
        assert!(is_network_path(Path::new(r"\\?\UNC\server\share\files")));
    }
}
