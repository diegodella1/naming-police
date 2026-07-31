use std::{
    fs::File,
    io::{BufReader, Read},
    path::{Path, PathBuf},
    process::Command,
};

use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::{DateTime, Local};
use exif::{In, Reader as ExifReader, Tag};
use image::{codecs::jpeg::JpegEncoder, ImageReader};

use crate::error::{AppError, Result};

#[derive(Debug, Clone)]
pub struct ExtractedContent {
    pub file_kind: String,
    pub mime_type: String,
    pub captured_date: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub thumbnail_data_url: Option<String>,
    pub thumbnail_base64: Option<String>,
    pub text: Option<String>,
    pub sources: Vec<String>,
}

pub fn hash_file(path: &Path) -> Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher.finalize().to_hex().to_string())
}

pub fn extract(path: &Path) -> Result<ExtractedContent> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match extension.as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "tif" | "tiff" => extract_image(path, &extension),
        "heic" | "heif" => Err(AppError::Unsupported(
            "HEIC requiere codec nativo disponible en este sistema".into(),
        )),
        "pdf" => extract_pdf(path),
        _ => Err(AppError::Unsupported(extension)),
    }
}

fn modified_date(path: &Path) -> Option<String> {
    let modified = path.metadata().ok()?.modified().ok()?;
    let date: DateTime<Local> = modified.into();
    Some(date.format("%Y-%m-%d").to_string())
}

fn rational_to_f64(value: exif::Rational) -> f64 {
    value.num as f64 / value.denom as f64
}

fn gps_coordinate(field: &exif::Field) -> Option<f64> {
    if let exif::Value::Rational(values) = &field.value {
        if values.len() >= 3 {
            return Some(
                rational_to_f64(values[0])
                    + rational_to_f64(values[1]) / 60.0
                    + rational_to_f64(values[2]) / 3600.0,
            );
        }
    }
    None
}

fn extract_image(path: &Path, extension: &str) -> Result<ExtractedContent> {
    let image = ImageReader::open(path)
        .map_err(AppError::Io)?
        .with_guessed_format()
        .map_err(AppError::Io)?
        .decode()
        .map_err(|error| AppError::Unsupported(error.to_string()))?;
    let thumbnail = image.thumbnail(1024, 1024).to_rgb8();
    let mut jpeg = Vec::new();
    JpegEncoder::new_with_quality(&mut jpeg, 78)
        .encode_image(&thumbnail)
        .map_err(|error| AppError::Unsupported(error.to_string()))?;
    let thumbnail_base64 = STANDARD.encode(jpeg);
    let mut captured_date = modified_date(path);
    let mut latitude = None;
    let mut longitude = None;
    let mut sources = vec!["metadata".into()];
    if matches!(extension, "jpg" | "jpeg" | "tif" | "tiff") {
        if let Ok(file) = File::open(path) {
            if let Ok(exif) = ExifReader::new().read_from_container(&mut BufReader::new(file)) {
                if let Some(field) = exif.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
                    let display = field.display_value().with_unit(&exif).to_string();
                    if display.len() >= 10 {
                        captured_date = Some(display[..10].replace(':', "-"));
                    }
                }
                latitude = exif
                    .get_field(Tag::GPSLatitude, In::PRIMARY)
                    .and_then(gps_coordinate);
                longitude = exif
                    .get_field(Tag::GPSLongitude, In::PRIMARY)
                    .and_then(gps_coordinate);
                let lat_south = exif
                    .get_field(Tag::GPSLatitudeRef, In::PRIMARY)
                    .is_some_and(|field| field.display_value().to_string().contains('S'));
                let lon_west = exif
                    .get_field(Tag::GPSLongitudeRef, In::PRIMARY)
                    .is_some_and(|field| field.display_value().to_string().contains('W'));
                if lat_south {
                    latitude = latitude.map(|value| -value);
                }
                if lon_west {
                    longitude = longitude.map(|value| -value);
                }
                sources.push("exif".into());
                if latitude.is_some() && longitude.is_some() {
                    sources.push("gps".into());
                }
            }
        }
    }
    let ocr = run_tesseract(path)
        .ok()
        .filter(|value| !value.trim().is_empty());
    if ocr.is_some() {
        sources.push("ocr".into());
    }
    Ok(ExtractedContent {
        file_kind: "image".into(),
        mime_type: format!("image/{extension}"),
        captured_date,
        latitude,
        longitude,
        thumbnail_data_url: Some(format!("data:image/jpeg;base64,{thumbnail_base64}")),
        thumbnail_base64: Some(thumbnail_base64),
        text: ocr.map(|value| truncate_text(&value)),
        sources,
    })
}

fn extract_pdf(path: &Path) -> Result<ExtractedContent> {
    let mut text = std::panic::catch_unwind(|| pdf_extract::extract_text(path))
        .map_err(|_| AppError::Unsupported("PDF inválido".into()))?
        .map_err(|error| AppError::Unsupported(error.to_string()))?;
    let mut sources = vec!["metadata".into()];
    if text.trim().len() < 40 {
        let ocr = ocr_pdf(path).map_err(|_| {
            AppError::Unsupported("PDF escaneado: OCR no está incluido en esta beta".into())
        })?;
        if ocr.trim().is_empty() {
            return Err(AppError::Unsupported(
                "PDF escaneado: OCR no está incluido en esta beta".into(),
            ));
        }
        text = ocr;
        sources.push("ocr".into());
    } else {
        sources.push("pdf_text".into());
    }
    Ok(ExtractedContent {
        file_kind: "document".into(),
        mime_type: "application/pdf".into(),
        captured_date: modified_date(path),
        latitude: None,
        longitude: None,
        thumbnail_data_url: None,
        thumbnail_base64: None,
        text: Some(truncate_text(&text)),
        sources,
    })
}

fn truncate_text(value: &str) -> String {
    value.chars().take(20_000).collect()
}

fn run_tesseract(path: &Path) -> Result<String> {
    let output = Command::new(tesseract_binary())
        .arg(path)
        .arg("stdout")
        .arg("-l")
        .arg("spa+eng")
        .arg("--psm")
        .arg("6")
        .output()
        .map_err(AppError::Io)?;
    if !output.status.success() {
        return Err(AppError::Unsupported("OCR local no disponible".into()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn ocr_pdf(path: &Path) -> Result<String> {
    let directory = tempfile::tempdir()?;
    let prefix = directory.path().join("page");
    let status = Command::new(pdftoppm_binary())
        .arg("-f")
        .arg("1")
        .arg("-l")
        .arg("10")
        .arg("-r")
        .arg("150")
        .arg("-png")
        .arg(path)
        .arg(&prefix)
        .status()?;
    if !status.success() {
        return Err(AppError::Unsupported(
            "No se pudo renderizar PDF para OCR".into(),
        ));
    }
    let mut pages: Vec<PathBuf> = std::fs::read_dir(directory.path())?
        .flatten()
        .map(|entry| entry.path())
        .filter(|page| page.extension().is_some_and(|ext| ext == "png"))
        .collect();
    pages.sort();
    let mut output = String::new();
    for page in pages {
        output.push_str(&run_tesseract(&page)?);
        output.push('\n');
    }
    Ok(output)
}

fn tesseract_binary() -> &'static str {
    if cfg!(target_os = "windows") {
        "tesseract.exe"
    } else {
        "tesseract"
    }
}

fn pdftoppm_binary() -> &'static str {
    if cfg!(target_os = "windows") {
        "pdftoppm.exe"
    } else {
        "pdftoppm"
    }
}
