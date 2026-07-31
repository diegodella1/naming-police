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
            evidence_value(&fields.person).or_else(|| evidence_value(&fields.subject)),
            evidence_value(&fields.document_title).or_else(|| evidence_value(&fields.topic)),
            evidence_value(&fields.role),
            evidence_value(&fields.organization).or_else(|| evidence_value(&fields.vendor)),
        ]
        .into_iter()
        .flatten()
        .collect(),
    };
    slugify(&parts.join("-"), 80)
}

fn stem_tokens(filename: &str) -> Vec<String> {
    let stem = Path::new(filename)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    slugify(&stem, 120)
        .split('-')
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn generic_token(token: &str) -> bool {
    matches!(
        token,
        "archivo"
            | "file"
            | "document"
            | "documento"
            | "download"
            | "scan"
            | "scanned"
            | "img"
            | "image"
            | "dsc"
            | "foto"
            | "photo"
            | "screenshot"
            | "captura"
            | "sin"
            | "fecha"
            | "copy"
            | "copia"
            | "final"
            | "nuevo"
            | "new"
    )
}

pub fn is_generic_filename(filename: &str) -> bool {
    let tokens = stem_tokens(filename);
    if tokens.is_empty() {
        return true;
    }
    let joined = tokens.join("");
    let hash_like = joined.len() >= 16
        && joined
            .chars()
            .all(|character| character.is_ascii_hexdigit());
    let numeric_camera_name = tokens
        .first()
        .is_some_and(|token| matches!(token.as_str(), "img" | "dsc"))
        && tokens
            .iter()
            .skip(1)
            .all(|token| token.chars().all(|character| character.is_ascii_digit()));
    hash_like
        || numeric_camera_name
        || tokens.iter().all(|token| {
            generic_token(token) || token.chars().all(|character| character.is_ascii_digit())
        })
}

fn edit_distance(left: &str, right: &str) -> usize {
    let mut previous: Vec<usize> = (0..=right.chars().count()).collect();
    for (row, left_char) in left.chars().enumerate() {
        let mut current = vec![row + 1];
        for (column, right_char) in right.chars().enumerate() {
            current.push(
                (current[column] + 1)
                    .min(previous[column + 1] + 1)
                    .min(previous[column] + usize::from(left_char != right_char)),
            );
        }
        previous = current;
    }
    previous.last().copied().unwrap_or_default()
}

fn fuzzy_match(left: &str, right: &str) -> bool {
    left == right
        || (left.len().min(right.len()) >= 5
            && edit_distance(left, right) <= (left.len().max(right.len()) / 4).max(1))
}

pub fn should_suggest(current: &str, proposed: &str, confidence: f64) -> bool {
    if confidence < 0.65 || is_generic_filename(proposed) {
        return false;
    }
    let current_slug = stem_tokens(current).join("-");
    let proposed_slug = stem_tokens(proposed).join("-");
    if current_slug == proposed_slug {
        return false;
    }
    if is_generic_filename(current) {
        return true;
    }
    let current_tokens: Vec<_> = stem_tokens(current)
        .into_iter()
        .filter(|token| !generic_token(token))
        .collect();
    let proposed_tokens: Vec<_> = stem_tokens(proposed)
        .into_iter()
        .filter(|token| !generic_token(token))
        .collect();
    let preserves_all = current_tokens.iter().all(|current_token| {
        proposed_tokens
            .iter()
            .any(|proposed_token| fuzzy_match(current_token, proposed_token))
    });
    if !preserves_all {
        return false;
    }
    let corrects_spelling = current_tokens.iter().any(|current_token| {
        proposed_tokens.iter().any(|proposed_token| {
            current_token != proposed_token && fuzzy_match(current_token, proposed_token)
        })
    });
    let adds_specific_fact = proposed_tokens.iter().any(|proposed_token| {
        !current_tokens
            .iter()
            .any(|current_token| fuzzy_match(current_token, proposed_token))
    });
    corrects_spelling || adds_specific_fact
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
    fn accepts_supported_cv_spelling_corrections() {
        assert!(should_suggest(
            "cv-diego-dell-agsoitino-execitve-summary.pdf",
            "cv-diego-dell-agostino-executive-summary.pdf",
            0.9,
        ));
    }

    #[test]
    fn rejects_generic_replacement_for_descriptive_name() {
        assert!(!should_suggest(
            "cv-diego-dell-agostino-executive-summary.pdf",
            "documento-2026-07-31.pdf",
            0.95,
        ));
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
