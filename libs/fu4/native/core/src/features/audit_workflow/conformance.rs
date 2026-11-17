use std::collections::BTreeMap;
use std::path::Path;

use camino::Utf8Path;
use serde::Deserialize;

use super::finding::Persona;
use super::registry::input::InputKind;
use super::{AuditOptions, findings, group_of};

#[derive(Deserialize)]
struct Case {
    input: String,
    config: Option<String>,
    findings: Vec<Expected>,
}

#[derive(Deserialize, Debug, PartialEq, Eq, PartialOrd, Ord, Clone)]
struct Expected {
    ident: String,
    line: usize,
    column: usize,
    annotation: String,
    severity: String,
    confidence: String,
    persona: String,
}

fn fixtures() -> &'static Path {
    Path::new(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/tests/fixtures/zizmor"
    ))
}

fn rules(config: Option<&str>) -> Option<serde_json::Value> {
    let text = std::fs::read_to_string(fixtures().join("inputs").join(config?)).ok()?;
    let value: serde_json::Value = yaml_serde::from_str(&text).ok()?;
    value.get("rules").cloned()
}

fn actual(case: &Case) -> Vec<Expected> {
    let root = Utf8Path::from_path(fixtures())
        .expect("fixture path is UTF-8")
        .join("inputs");
    let options = AuditOptions {
        rules: rules(case.config.as_deref()),
        persona: Persona::Auditor,
        ..AuditOptions::default()
    };
    let Ok(mut group) = group_of(&root, &options) else {
        return Vec::new();
    };
    let path = root.join(&case.input);
    let kind = InputKind::from_path(&path).expect("fixture is YAML");
    let text = std::fs::read_to_string(&path).expect("fixture is readable");
    let key = group.key(&path);
    if group.register(kind, &text, key).is_err() {
        return Vec::new();
    }
    let mut found: Vec<Expected> = findings(&group, &options)
        .expect("audits run")
        .iter()
        .map(|finding| {
            let primary = finding.primary_location();
            let point = primary.concrete.location.start_point;
            Expected {
                ident: finding.ident.to_owned(),
                line: point.row + 1,
                column: point.column + 1,
                annotation: primary.symbolic.annotation.to_string(),
                severity: format!("{:?}", finding.determinations.severity),
                confidence: format!("{:?}", finding.determinations.confidence),
                persona: format!("{:?}", finding.determinations.persona),
            }
        })
        .collect();
    found.sort();
    found
}

#[test]
fn matches_zizmor_on_its_own_test_inputs() {
    let text = std::fs::read_to_string(fixtures().join("expected.json")).expect("oracle exists");
    let cases: Vec<Case> = serde_json::from_str(&text).expect("oracle is JSON");
    let mut mismatches = BTreeMap::new();
    for case in &cases {
        let mut expected = case.findings.clone();
        expected.sort();
        let found = actual(case);
        if found != expected {
            let missing: Vec<_> = expected
                .iter()
                .filter(|e| !found.contains(e))
                .cloned()
                .collect();
            let extra: Vec<_> = found
                .iter()
                .filter(|f| !expected.contains(f))
                .cloned()
                .collect();
            mismatches.insert(
                format!(
                    "{} ({})",
                    case.input,
                    case.config.as_deref().unwrap_or("no config")
                ),
                (missing, extra),
            );
        }
    }
    assert!(
        mismatches.is_empty(),
        "{} of {} cases differ from zizmor:\n{mismatches:#?}",
        mismatches.len(),
        cases.len()
    );
}
