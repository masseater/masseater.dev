use std::collections::{BTreeMap, HashSet};
use std::io::Write;
use std::sync::Arc;

use anyhow::{Context, Result, bail};
use kingfisher_rules::{Confidence, RuleCacheConfig, Rules, RulesDatabase};
use kingfisher_scanner::{Blob, Scanner};
use serde_json::Value;
use tracing::info_span;

use crate::shared::finding::Finding;

const ALLOW_MARKER: &[u8] = b"h56m:allow";

pub struct Detector {
    scanner: Scanner,
    ignored: HashSet<String>,
}

fn rules_of(config: &Value) -> Result<Rules> {
    if config.pointer("/extend/useDefault") == Some(&Value::Bool(true)) {
        bail!(
            "h56m has no built-in rules; extend a preset file with extend.path instead of useDefault"
        );
    }
    let text = toml::to_string(config).context("h56m config is not representable as TOML")?;
    let mut file = tempfile::Builder::new()
        .prefix("h56m-")
        .suffix(".toml")
        .tempfile()
        .context("could not create a temporary rules file")?;
    file.write_all(text.as_bytes())?;
    Rules::from_toml_file(file.path(), Confidence::Low)
}

fn line_bounds(text: &[u8], start: usize, end: usize) -> (usize, usize) {
    let start = start.min(text.len());
    let end = end.min(text.len()).max(start);
    let first = text[..start]
        .iter()
        .rposition(|byte| *byte == b'\n')
        .map_or(0, |index| index + 1);
    let last = text[end..]
        .iter()
        .position(|byte| *byte == b'\n')
        .map_or(text.len(), |index| end + index);
    (first, last)
}

fn utf16_column(text: &[u8], offset: usize) -> usize {
    let offset = offset.min(text.len());
    let (start, _) = line_bounds(text, offset, offset);
    String::from_utf8_lossy(&text[start..offset])
        .encode_utf16()
        .count()
}

fn with_columns(text: &[u8], finding: Finding) -> Finding {
    Finding {
        column: utf16_column(text, finding.start_offset) + 1,
        end_column: utf16_column(text, finding.end_offset),
        ..finding
    }
}

fn allowed_inline(text: &[u8], finding: &Finding) -> bool {
    let (first, last) = line_bounds(text, finding.start_offset, finding.end_offset);
    text[first..last]
        .windows(ALLOW_MARKER.len())
        .any(|window| window == ALLOW_MARKER)
}

impl Detector {
    pub fn new(config: &Value, ignored: impl IntoIterator<Item = String>) -> Result<Self> {
        let _span = info_span!("h56m.compile_rules").entered();
        let rules = rules_of(config)?;
        let database = RulesDatabase::from_rule_collection_with_cache(
            rules,
            &RuleCacheConfig::from_dir_or_env(None),
        )?;
        Ok(Self {
            scanner: Scanner::new(Arc::new(database)),
            ignored: ignored.into_iter().collect(),
        })
    }

    pub fn scan(&self, path: &str, text: &[u8]) -> Result<Vec<Finding>> {
        let attributes = BTreeMap::from([("path".to_owned(), path.to_owned())]);
        let blob = Blob::from_bytes(text.to_vec());
        let found = self.scanner.scan_blob_with_attributes(&blob, &attributes)?;
        let mut findings: Vec<Finding> = found
            .iter()
            .filter(|finding| finding.rule().visible())
            .map(|finding| Finding::from_scanner(finding, path))
            .filter(|finding| !self.ignored.contains(&finding.digest))
            .filter(|finding| !allowed_inline(text, finding))
            .map(|finding| with_columns(text, finding))
            .collect();
        findings.sort_by_key(|finding| (finding.start_offset, finding.end_offset));
        Ok(findings)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::Detector;
    use crate::shared::finding::{Confidence, Finding, digest_of};

    const TOKEN: &str = concat!("ghp", "_4Fq8sLm2Zt9Wn6Rb1Yc3Xv7Hk5Pd0Ja8Qe2T");
    const PRESET: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/preset.toml");
    const NONE: [&str; 0] = [];

    fn defaults() -> Value {
        json!({ "extend": { "path": PRESET } })
    }

    fn detector(config: &Value) -> Detector {
        Detector::new(config, []).unwrap()
    }

    fn found(detector: &Detector, path: &str, text: &str) -> Vec<Finding> {
        detector.scan(path, text.as_bytes()).unwrap()
    }

    fn rules(detector: &Detector, text: &str) -> Vec<String> {
        found(detector, "a.ts", text)
            .into_iter()
            .map(|finding| finding.rule)
            .collect()
    }

    #[test]
    fn reports_a_preset_rule_with_its_metadata() {
        let found = found(
            &detector(&defaults()),
            "a.ts",
            &format!("token = \"{TOKEN}\"\n"),
        );
        assert_eq!(found.len(), 1);
        let finding = &found[0];
        assert_eq!(finding.rule, "github-pat");
        assert_eq!(finding.path, "a.ts");
        assert_eq!(finding.secret, TOKEN);
        assert_eq!(finding.digest, digest_of(TOKEN));
        assert_eq!(finding.confidence, Confidence::Medium);
        assert!(!finding.encoded);
        assert!(finding.description.contains("GitHub"));
    }

    #[test]
    fn positions_are_one_based_utf16_columns_with_an_inclusive_end() {
        let text = format!("a\r\nx = \"{TOKEN}\"\r\nあいう {TOKEN}\n");
        let found = found(&detector(&defaults()), "a.ts", &text);
        let positions: Vec<_> = found
            .iter()
            .map(|finding| {
                (
                    finding.line,
                    finding.column,
                    finding.end_line,
                    finding.end_column,
                )
            })
            .collect();
        assert_eq!(positions, [(2, 6, 2, 45), (3, 5, 3, 44)]);
    }

    #[test]
    fn decodes_base64_and_marks_the_finding() {
        let encoded = concat!(
            "a2V5OiBnaHBf",
            "NEZxOHNMbTJadDlXbjZSYjFZYzNYdjdIazVQZDBKYThRZTJU"
        );
        let found = found(&detector(&defaults()), "a.ts", &format!("{encoded}\n"));
        assert_eq!(found.len(), 1);
        assert!(found[0].encoded);
        assert_eq!(found[0].secret, TOKEN);
    }

    #[test]
    fn finds_nothing_in_plain_or_binary_text() {
        let detector = detector(&defaults());
        assert_eq!(rules(&detector, "const answer = 42;\n"), NONE);
        assert_eq!(rules(&detector, ""), NONE);
        assert_eq!(
            detector
                .scan("a.bin", &[0, 159, 146, 150, 255])
                .unwrap()
                .len(),
            0
        );
    }

    #[test]
    fn skips_secrets_whose_digest_is_ignored() {
        let ignoring = Detector::new(&defaults(), [digest_of(TOKEN)]).unwrap();
        assert_eq!(rules(&ignoring, &format!("token = \"{TOKEN}\"\n")), NONE);
    }

    #[test]
    fn an_inline_allow_covers_only_its_own_line() {
        let detector = detector(&defaults());
        let text = format!("a = \"{TOKEN}\" // h56m:allow\nb = \"{TOKEN}\"\n");
        let found = found(&detector, "a.ts", &text);
        assert_eq!(
            found.iter().map(|finding| finding.line).collect::<Vec<_>>(),
            [2]
        );
    }

    #[test]
    fn adds_configured_rules_next_to_the_defaults() {
        let config = json!({
            "extend": { "path": PRESET },
            "rules": [{ "id": "watashi-token", "regex": "\\b(wt_[A-Za-z0-9]{20})\\b", "keywords": ["wt_"] }]
        });
        let text = format!("x = wt_abcdefghij0123456789\ny = \"{TOKEN}\"\n");
        assert_eq!(
            rules(&detector(&config), &text),
            ["watashi-token", "github-pat"]
        );
    }

    #[test]
    fn uses_only_configured_rules_without_the_defaults() {
        let config = json!({ "rules": [{ "id": "only", "regex": "\\b(only_[0-9]{8})\\b", "keywords": ["only_"] }] });
        let text = format!("only_12345678 \"{TOKEN}\"\n");
        assert_eq!(rules(&detector(&config), &text), ["only"]);
    }

    #[test]
    fn disabled_rules_stop_reporting() {
        let config = json!({ "extend": { "path": PRESET, "disabledRules": ["github-pat"] } });
        assert_eq!(
            rules(&detector(&config), &format!("t = \"{TOKEN}\"\n")),
            NONE
        );
    }

    #[test]
    fn the_global_filter_sees_the_line_and_the_path() {
        let config = json!({
            "extend": { "path": PRESET },
            "filter": "matchesAny(finding.line, [`PUBLIC_FIXTURE`]) || matchesAny(attributes[\"path\"], [`^fixtures/`])"
        });
        let detector = detector(&config);
        assert_eq!(
            rules(&detector, &format!("PUBLIC_FIXTURE = \"{TOKEN}\"\n")),
            NONE
        );
        assert_eq!(
            found(&detector, "fixtures/a.ts", &format!("t = \"{TOKEN}\"\n")).len(),
            0
        );
        assert_eq!(
            found(&detector, "src/a.ts", &format!("t = \"{TOKEN}\"\n")).len(),
            1
        );
    }

    #[test]
    fn a_rule_filter_drops_its_own_findings() {
        let config = json!({
            "rules": [{
                "id": "pasted",
                "regex": "\\b([A-Za-z0-9]{32})\\b",
                "filter": "entropy(finding[\"secret\"]) < 4.0"
            }]
        });
        let detector = detector(&config);
        assert_eq!(rules(&detector, "aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb\n"), NONE);
        assert_eq!(
            rules(&detector, "Zq3x9LmT7vR2nB8kW4yH6pD1sF5gJ0cA\n"),
            ["pasted"]
        );
    }

    #[test]
    fn helper_rules_are_not_reported_on_their_own() {
        let detector = detector(&defaults());
        let found = rules(&detector, "username: \"deploy-bot\"\n");
        assert!(
            !found.iter().any(|rule| rule == "generic-username"),
            "{found:?}"
        );
    }

    #[test]
    fn has_no_rules_of_its_own() {
        let built_in = json!({ "extend": { "useDefault": true } });
        assert!(Detector::new(&built_in, []).is_err());
        let custom = json!({ "rules": [{ "id": "only", "regex": "\\b(only_[0-9]{8})\\b" }] });
        assert_eq!(
            rules(&detector(&custom), &format!("t = \"{TOKEN}\"\n")),
            NONE
        );
    }

    #[test]
    fn rejects_an_invalid_config() {
        let bad_regex = json!({ "rules": [{ "id": "bad", "regex": "(" }] });
        assert!(Detector::new(&bad_regex, []).is_err());
        let unknown = json!({ "extend": { "path": PRESET }, "unknownKey": true });
        assert!(Detector::new(&unknown, []).is_err());
    }

    #[test]
    fn orders_findings_by_position() {
        let config = json!({
            "extend": { "path": PRESET },
            "rules": [{ "id": "watashi-token", "regex": "\\b(wt_[A-Za-z0-9]{20})\\b", "keywords": ["wt_"] }]
        });
        let text = format!("{TOKEN}\nwt_abcdefghij0123456789\n");
        assert_eq!(
            rules(&detector(&config), &text),
            ["github-pat", "watashi-token"]
        );
    }
}
