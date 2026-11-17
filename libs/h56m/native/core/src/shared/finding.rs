use std::fmt::Write;

use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Confidence {
    Low,
    Medium,
    High,
}

impl From<kingfisher_rules::Confidence> for Confidence {
    fn from(confidence: kingfisher_rules::Confidence) -> Self {
        match confidence {
            kingfisher_rules::Confidence::Low => Self::Low,
            kingfisher_rules::Confidence::Medium => Self::Medium,
            kingfisher_rules::Confidence::High => Self::High,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub rule: String,
    pub description: String,
    pub confidence: Confidence,
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub end_line: usize,
    pub end_column: usize,
    #[serde(skip)]
    pub start_offset: usize,
    #[serde(skip)]
    pub end_offset: usize,
    pub secret: String,
    pub digest: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit: Option<String>,
    pub encoded: bool,
}

const SOURCE_PREFIXES: [&str; 2] = ["custom.", "betterleaks."];

fn rule_of(id: &str) -> String {
    SOURCE_PREFIXES
        .iter()
        .find_map(|prefix| id.strip_prefix(prefix))
        .unwrap_or(id)
        .to_owned()
}

impl Finding {
    #[must_use]
    pub fn from_scanner(finding: &kingfisher_scanner::Finding, path: &str) -> Self {
        let location = &finding.location;
        Self {
            rule: rule_of(&finding.rule_id),
            description: finding.rule_name.clone(),
            confidence: finding.confidence.into(),
            path: path.to_owned(),
            line: location.line,
            column: location.column + 1,
            end_line: location.end_line,
            end_column: location.end_column + 1,
            start_offset: location.start_offset,
            end_offset: location.end_offset,
            digest: digest_of(&finding.secret),
            secret: finding.secret.clone(),
            commit: None,
            encoded: finding.is_base64_encoded,
        }
    }
}

#[must_use]
pub fn digest_of(secret: &str) -> String {
    Sha256::digest(secret.as_bytes())
        .iter()
        .fold(String::new(), |mut hex, byte| {
            let _ = write!(hex, "{byte:02x}");
            hex
        })
}

#[cfg(test)]
mod tests {
    use super::digest_of;

    #[test]
    fn digest_is_lowercase_sha256_hex() {
        assert_eq!(
            digest_of("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
