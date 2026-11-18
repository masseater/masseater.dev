mod codec;
mod config;
mod scanner;
mod span;

use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, LazyLock, Mutex, PoisonError};

use anyhow::Result;
use serde_json::Value;
use tracing::info_span;

use crate::shared::finding::{Confidence, Finding, digest_of};
use scanner::{Hit, Scanner};

const ALLOW_MARKER: &[u8] = b"h56m:allow";
const BINARY_PROBE: usize = 8000;

static COMPILED: LazyLock<Mutex<HashMap<String, Arc<Scanner>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn compile(config: &Value) -> Result<Arc<Scanner>> {
    let key = config.to_string();
    let mut compiled = COMPILED.lock().unwrap_or_else(PoisonError::into_inner);
    if let Some(scanner) = compiled.get(&key) {
        return Ok(Arc::clone(scanner));
    }
    let _span = info_span!("h56m.compile_rules").entered();
    let scanner = Arc::new(Scanner::new(config::load(config)?)?);
    compiled.insert(key, Arc::clone(&scanner));
    Ok(scanner)
}

pub struct Detector {
    scanner: Arc<Scanner>,
    ignored: HashSet<String>,
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

fn allowed_inline(text: &[u8], finding: &Finding) -> bool {
    let (first, last) = line_bounds(text, finding.start_offset, finding.end_offset);
    text[first..last]
        .windows(ALLOW_MARKER.len())
        .any(|window| window == ALLOW_MARKER)
}

struct Decoded<'a> {
    text: Cow<'a, str>,
    original: Vec<(usize, usize)>,
}

impl Decoded<'_> {
    fn new(bytes: &[u8]) -> Decoded<'_> {
        if let Ok(text) = std::str::from_utf8(bytes) {
            return Decoded {
                text: Cow::Borrowed(text),
                original: Vec::new(),
            };
        }
        let mut text = String::with_capacity(bytes.len());
        let mut original = Vec::new();
        let mut at = 0;
        for chunk in bytes.utf8_chunks() {
            original.push((text.len(), at));
            text.push_str(chunk.valid());
            at += chunk.valid().len();
            if !chunk.invalid().is_empty() {
                original.push((text.len(), at));
                text.push(char::REPLACEMENT_CHARACTER);
                at += chunk.invalid().len();
            }
        }
        Decoded {
            text: Cow::Owned(text),
            original,
        }
    }

    fn offset(&self, offset: usize) -> usize {
        if self.original.is_empty() {
            return offset;
        }
        let index = self.original.partition_point(|(text, _)| *text <= offset);
        let (text, bytes) = self.original[index.saturating_sub(1)];
        bytes + (offset - text)
    }
}

fn confidence_of(level: &str) -> Confidence {
    match level {
        "high" => Confidence::High,
        "low" => Confidence::Low,
        _ => Confidence::Medium,
    }
}

impl Detector {
    pub fn new(config: &Value, ignored: impl IntoIterator<Item = String>) -> Result<Self> {
        Ok(Self {
            scanner: compile(config)?,
            ignored: ignored.into_iter().collect(),
        })
    }

    fn finding(text: &[u8], decoded: &Decoded<'_>, path: &str, hit: Hit) -> Finding {
        let start = decoded.offset(hit.start);
        let end = decoded.offset(hit.end);
        Finding {
            rule: hit.rule_id,
            description: hit.description,
            confidence: confidence_of(&hit.confidence),
            path: path.to_owned(),
            line: hit.start_line,
            column: utf16_column(text, start) + 1,
            end_line: hit.end_line,
            end_column: utf16_column(text, end),
            start_offset: start,
            end_offset: end,
            digest: digest_of(&hit.secret),
            secret: hit.secret,
            commit: None,
            encoded: hit.encoded,
        }
    }

    pub fn scan(&self, path: &str, text: &[u8]) -> Result<Vec<Finding>> {
        if text[..text.len().min(BINARY_PROBE)].contains(&0) {
            return Ok(Vec::new());
        }
        let decoded = Decoded::new(text);
        let mut findings: Vec<Finding> = self
            .scanner
            .scan(path, &decoded.text)?
            .into_iter()
            .map(|hit| Self::finding(text, &decoded, path, hit))
            .filter(|finding| !self.ignored.contains(&finding.digest))
            .filter(|finding| !allowed_inline(text, finding))
            .collect();
        findings.sort_by_key(|finding| (finding.start_offset, finding.end_offset));
        Ok(findings)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use std::sync::Arc;

    use super::{Detector, compile};
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
    fn compiles_each_config_once() {
        let config = defaults();
        let other = json!({ "extend": { "path": PRESET, "disabledRules": ["github-pat"] } });
        let first = compile(&config).unwrap();
        assert!(Arc::ptr_eq(&first, &compile(&config).unwrap()));
        assert!(!Arc::ptr_eq(&first, &compile(&other).unwrap()));
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

    #[test]
    fn a_rule_with_components_needs_them_nearby() {
        let config = json!({ "rules": [
            { "id": "pair", "regex": "\\bid_([a-z0-9]{8})\\b", "keywords": ["id_"], "components": [{ "id": "key", "within": "2L" }] },
            { "id": "key", "regex": "\\bkey_([a-z0-9]{8})\\b", "keywords": ["key_"], "skipReport": true }
        ] });
        let detector = detector(&config);
        assert_eq!(rules(&detector, "id_abcd1234\nkey_wxyz9876\n"), ["pair"]);
        assert_eq!(rules(&detector, "id_abcd1234\n\n\n\nkey_wxyz9876\n"), NONE);
    }

    #[test]
    fn a_more_specific_rule_hides_a_generic_one_on_the_same_secret() {
        let config = json!({ "rules": [
            { "id": "generic", "regex": "token = \"([a-zA-Z0-9_]{20,})\"", "keywords": ["token"] },
            { "id": "specific", "regex": "ghp_[0-9a-zA-Z]{36}", "keywords": ["ghp_"], "specificity": 10 }
        ] });
        assert_eq!(
            rules(&detector(&config), &format!("token = \"{TOKEN}\"\n")),
            ["specific"]
        );
    }

    #[test]
    fn a_path_rule_reports_the_file_itself() {
        let config = json!({ "rules": [{ "id": "keystore", "path": "\\.p12$" }] });
        let detector = detector(&config);
        assert_eq!(found(&detector, "certs/a.p12", "x").len(), 1);
        assert_eq!(found(&detector, "certs/a.pem", "x").len(), 0);
    }

    #[test]
    fn honours_the_betterleaks_allow_comment() {
        let text = format!("t = \"{TOKEN}\" # betterleaks:allow\n");
        assert_eq!(rules(&detector(&defaults()), &text), NONE);
    }

    #[test]
    fn decodes_hex_and_percent_text() {
        let hex: String = format!("key: {TOKEN}")
            .bytes()
            .map(|b| format!("{b:02x}"))
            .collect::<Vec<_>>()
            .concat();
        let percent: String = TOKEN
            .bytes()
            .map(|b| format!("%{b:02X}"))
            .collect::<Vec<_>>()
            .concat();
        let detector = detector(&defaults());
        for text in [format!("v = {hex}\n"), format!("v = {percent}\n")] {
            let found = found(&detector, "a.ts", &text);
            assert_eq!(found.len(), 1, "{text}");
            assert!(found[0].encoded);
            assert_eq!(found[0].secret, TOKEN);
        }
    }

    #[test]
    fn keeps_byte_offsets_after_invalid_utf8() {
        let mut text = vec![0xff, 0xfe, b'\n'];
        text.extend_from_slice(format!("t = \"{TOKEN}\"\n").as_bytes());
        let found = detector(&defaults()).scan("a.ts", &text).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(
            &text[found[0].start_offset..found[0].end_offset],
            TOKEN.as_bytes()
        );
        assert_eq!((found[0].line, found[0].column), (2, 6));
    }

    #[test]
    fn rejects_duplicate_ids_and_unknown_components() {
        let duplicate =
            json!({ "rules": [{ "id": "a", "regex": "a" }, { "id": "a", "regex": "b" }] });
        assert!(Detector::new(&duplicate, []).is_err());
        let dangling =
            json!({ "rules": [{ "id": "a", "regex": "a", "components": [{ "id": "b" }] }] });
        assert!(Detector::new(&dangling, []).is_err());
    }
}
