use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use super::Diagnostic;
use super::config::Severity;
use super::rule::Rule;

const BUILD: &str = env!("Y8_BUILD_ID");

#[derive(Serialize, Deserialize)]
struct Stored {
    line: usize,
    rule: usize,
    detail: Option<String>,
    context: Option<String>,
    range: Option<(usize, usize)>,
    warning: bool,
}

pub struct ResultCache {
    directory: PathBuf,
    salt: blake3::Hash,
}

impl ResultCache {
    #[must_use]
    pub fn new(directory: &Path, config: &Map<String, Value>, inline: bool) -> Self {
        let mut hasher = blake3::Hasher::new();
        hasher.update(BUILD.as_bytes());
        hasher.update(&[u8::from(inline)]);
        hasher.update(Value::Object(config.clone()).to_string().as_bytes());
        Self {
            directory: directory.join(hasher.finalize().to_hex().as_str()),
            salt: hasher.finalize(),
        }
    }

    fn file_of(&self, path: &str, raw: &str) -> PathBuf {
        let mut hasher = blake3::Hasher::new_keyed(self.salt.as_bytes());
        hasher.update(path.as_bytes());
        hasher.update(&[0]);
        hasher.update(raw.as_bytes());
        self.directory
            .join(format!("{}.json", hasher.finalize().to_hex()))
    }

    pub fn load(
        &self,
        path: &str,
        raw: &str,
        rules: &[&'static dyn Rule],
    ) -> Option<Vec<Diagnostic>> {
        let text = std::fs::read(self.file_of(path, raw)).ok()?;
        let stored: Vec<Stored> = serde_json::from_slice(&text).ok()?;
        stored
            .into_iter()
            .map(|entry| {
                let meta = rules.get(entry.rule)?.meta();
                Some(Diagnostic {
                    line: entry.line,
                    rule_names: meta.names.to_vec(),
                    description: meta.description,
                    detail: entry.detail,
                    context: entry.context,
                    range: entry.range,
                    severity: if entry.warning {
                        Severity::Warning
                    } else {
                        Severity::Error
                    },
                })
            })
            .collect()
    }

    pub fn store(&self, path: &str, raw: &str, found: &[(usize, Diagnostic)]) {
        let stored: Vec<Stored> = found
            .iter()
            .map(|(rule, diagnostic)| Stored {
                line: diagnostic.line,
                rule: *rule,
                detail: diagnostic.detail.clone(),
                context: diagnostic.context.clone(),
                range: diagnostic.range,
                warning: diagnostic.severity == Severity::Warning,
            })
            .collect();
        let Ok(text) = serde_json::to_vec(&stored) else {
            return;
        };
        let file = self.file_of(path, raw);
        let partial = file.with_extension(format!("{}.tmp", std::process::id()));
        if std::fs::create_dir_all(&self.directory).is_ok()
            && std::fs::write(&partial, text).is_ok()
        {
            let _ = std::fs::rename(&partial, &file);
        }
    }
}
