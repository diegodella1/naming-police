use std::path::{Path, PathBuf};

use unicode_normalization::UnicodeNormalization;

use crate::{
    error::{AppError, Result},
    models::{AnalysisFields, PresetId},
};

const WINDOWS_RESERVED: &[&str] = &[
    "con", "prn", "aux", "nul", "clock$", "com1", "com2", "com3", "com4", "com5", "com6", "com7",
    "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
];

pub fn slugify(value: &str, max_chars: usize) -> String {
    let mut output = String::with_capacity(value.len());
    let mut separator_pending = false;
    for character in value.nfc().flat_map(char::to_lowercase) {
        if character.is_alphanumeric() {
            if separator_pending && !output.is_empty() {
                output.push('-');
            }
            separator_pending = false;
            output.push(character);
        } else {
            separator_pending = !output.is_empty();
        }
        if output.chars().count() >= max_chars {
            break;
        }
    }
    let mut output = output.trim_matches('-').to_string();
    while output.ends_with('.') || output.ends_with(' ') {
        output.pop();
    }
    if WINDOWS_RESERVED.contains(&output.as_str()) {
        output.push_str("-file");
    }
    output
}

fn evidence_value(field: &Option<crate::models::FieldEvidence>) -> Option<&str> {
    field
        .as_ref()
        .map(|evidence| evidence.value.trim())
        .filter(|value| !value.is_empty())
}

pub fn build_stem(
    preset: &PresetId,
    fields: &AnalysisFields,
    captured_date: Option<&str>,
    location: Option<&str>,
) -> String {
    let parts: Vec<&str> = match preset {
        PresetId::Screenshots => [
            evidence_value(&fields.topic),
            evidence_value(&fields.activity),
            captured_date,
        ]
        .into_iter()
        .flatten()
        .collect(),
        PresetId::TravelPhotos => [
            evidence_value(&fields.scene),
            evidence_value(&fields.subject),
            captured_date,
            location,
        ]
        .into_iter()
        .flatten()
        .collect(),
        PresetId::Invoices => [
            Some("factura"),
            evidence_value(&fields.vendor),
            evidence_value(&fields.document_date).or(captured_date),
            evidence_value(&fields.currency),
            evidence_value(&fields.amount),
            evidence_value(&fields.invoice_number),
        ]
        .into_iter()
        .flatten()
        .collect(),
        PresetId::General | PresetId::Custom => [
            evidence_value(&fields.document_type),
            evidence_value(&fields.topic),
            evidence_value(&fields.vendor),
            captured_date,
        ]
        .into_iter()
        .flatten()
        .collect(),
    };
    slugify(&parts.join("-"), 80)
}

pub fn sanitize_with_extension(candidate: &str, original_extension: &str) -> Result<String> {
    let candidate_path = Path::new(candidate);
    let stem = if candidate_path
        .extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case(original_extension))
    {
        candidate_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    } else {
        candidate.to_string()
    };
    let stem = slugify(&stem, 80);
    if stem.is_empty() {
        return Err(AppError::Validation(
            "El nombre debe contener letras o números".into(),
        ));
    }
    Ok(format!("{stem}.{original_extension}"))
}

pub fn collision_free_path(directory: &Path, filename: &str) -> Result<(PathBuf, bool)> {
    let candidate = directory.join(filename);
    if !candidate.exists() {
        return Ok((candidate, false));
    }
    let path = Path::new(filename);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let extension = path.extension().unwrap_or_default().to_string_lossy();
    for suffix in 2..=9999 {
        let filename = format!("{stem}-{suffix:02}.{extension}");
        let candidate = directory.join(filename);
        if !candidate.exists() {
            return Ok((candidate, true));
        }
    }
    Err(AppError::Conflict(
        "No se encontró un nombre libre después de 9999 intentos".into(),
    ))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn sanitizes_unicode_and_invalid_characters() {
        assert_eq!(
            sanitize_with_extension("  Café / Factura: Julio  ", "PDF").unwrap(),
            "café-factura-julio.PDF"
        );
    }

    #[test]
    fn avoids_windows_reserved_names() {
        assert_eq!(
            sanitize_with_extension("CON", "txt").unwrap(),
            "con-file.txt"
        );
    }

    #[test]
    fn collision_suffix_is_deterministic() {
        let directory = tempdir().unwrap();
        std::fs::write(directory.path().join("factura.pdf"), b"a").unwrap();
        std::fs::write(directory.path().join("factura-02.pdf"), b"a").unwrap();
        let (path, collision) = collision_free_path(directory.path(), "factura.pdf").unwrap();
        assert!(collision);
        assert_eq!(path.file_name().unwrap(), "factura-03.pdf");
    }
}
