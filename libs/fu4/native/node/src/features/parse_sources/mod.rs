use fu4_core::{ScriptLanguage, encode_document, encode_script};
use napi::JsString;
use napi::bindgen_prelude::{Buffer, Result};
use napi_derive::napi;
use rayon::prelude::*;
use tracing::info_span;

use napi_telemetry as telemetry;

#[napi(object)]
pub struct ParsedFile {
    pub path: String,
    pub source: Buffer,
}

#[napi(object)]
pub struct ParseOptions {
    pub traceparent: Option<String>,
}

#[napi]
pub fn parse_paths(
    root: String,
    paths: Vec<String>,
    options: ParseOptions,
) -> Result<Vec<ParsedFile>> {
    telemetry::init("fu4", env!("CARGO_PKG_VERSION"));
    let span = info_span!("fu4.parse_paths", "fu4.files" = paths.len());
    let ParseOptions { traceparent } = options;
    telemetry::adopt(&span, traceparent.as_deref());
    let _entered = span.enter();
    let parent = tracing::Span::current();
    let base = std::path::PathBuf::from(root);
    let encoded = paths
        .into_par_iter()
        .map(|path| {
            let _file =
                info_span!(parent: &parent, "fu4.parse_file", "code.file.path" = path.as_str())
                    .entered();
            match std::fs::read_to_string(base.join(&path)) {
                Ok(text) => Ok(Some((path, encode_document(&text)))),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
                Err(error) => Err(napi::Error::from_reason(format!("{path}: {error}"))),
            }
        })
        .collect::<Result<Vec<_>>>()?;
    Ok(encoded
        .into_iter()
        .flatten()
        .map(|(path, bytes)| ParsedFile {
            path,
            source: bytes.into(),
        })
        .collect())
}

#[napi]
pub fn parse_text(text: JsString) -> Result<Buffer> {
    let text = text.into_utf8()?;
    Ok(encode_document(text.as_str()?).into())
}

#[napi]
pub fn parse_script(language: JsString, text: JsString) -> Result<Buffer> {
    let language = language.into_utf8()?;
    let language = language.as_str()?;
    let text = text.into_utf8()?;
    let text = text.as_str()?;
    let language = ScriptLanguage::from_name(language)
        .ok_or_else(|| napi::Error::from_reason(format!("fu4 cannot parse {language} scripts")))?;
    Ok(encode_script(language, text).into())
}

#[napi]
#[must_use]
pub fn read_text(root: String, path: String) -> Option<String> {
    std::fs::read_to_string(std::path::PathBuf::from(root).join(path)).ok()
}

#[napi]
#[must_use]
pub fn path_exists(root: String, path: String) -> bool {
    std::path::PathBuf::from(root).join(path).exists()
}
