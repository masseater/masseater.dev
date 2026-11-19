use std::collections::BTreeMap;
use std::path::Path;

use super::{Input, Linter};

type Entry = (
    String,
    usize,
    Option<String>,
    Option<String>,
    Option<(usize, usize)>,
);

fn sorted(mut entries: Vec<Entry>) -> Vec<String> {
    let mut keys: Vec<String> = entries
        .drain(..)
        .map(|e| serde_json::to_string(&e).expect("entry"))
        .collect();
    keys.sort();
    keys
}

#[test]
fn matches_markdownlint_on_its_fixtures() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/markdownlint");
    let expected: BTreeMap<String, Vec<Entry>> = serde_json::from_str(
        &std::fs::read_to_string(dir.join("expected.json")).expect("expected.json"),
    )
    .expect("parse expected");
    let inputs: Vec<Input> = expected
        .keys()
        .map(|name| Input {
            path: name.clone(),
            text: std::fs::read_to_string(dir.join(name)).expect("fixture"),
        })
        .collect();
    let results =
        Linter::new(serde_json::Map::new(), true).lint_all(&inputs, super::Transfer::Nothing);
    let mut mismatches = Vec::new();
    for result in results {
        let actual: Vec<Entry> = result
            .diagnostics
            .iter()
            .map(|d| {
                (
                    d.rule_names[0].to_owned(),
                    d.line,
                    d.detail.clone(),
                    d.context.clone(),
                    d.range,
                )
            })
            .collect();
        let want = sorted(expected[&result.path].clone());
        let got = sorted(actual);
        if want != got {
            let missing: Vec<&String> = want.iter().filter(|k| !got.contains(k)).collect();
            let extra: Vec<&String> = got.iter().filter(|k| !want.contains(k)).collect();
            mismatches.push(format!(
                "{}\n  missing {missing:?}\n  extra {extra:?}",
                result.path
            ));
        }
    }
    assert!(
        mismatches.is_empty(),
        "{} files differ\n{}",
        mismatches.len(),
        mismatches
            .iter()
            .take(10)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}

type CallEntry = (
    String,
    usize,
    Option<String>,
    Option<String>,
    Option<(usize, usize)>,
    String,
);

#[derive(serde::Deserialize)]
struct LintCall {
    id: String,
    name: String,
    content: String,
    config: serde_json::Map<String, serde_json::Value>,
    inline: bool,
    unsupported: Vec<String>,
    expect: Vec<CallEntry>,
}

fn call_outcome(call: &LintCall) -> Vec<String> {
    if !call.unsupported.is_empty() {
        return vec![format!("not run: {}", call.unsupported.join(", "))];
    }
    let input = Input {
        path: call.name.clone(),
        text: call.content.clone(),
    };
    let results = Linter::new(call.config.clone(), call.inline)
        .lint_all(std::slice::from_ref(&input), super::Transfer::Nothing);
    let mut keys: Vec<String> = results
        .iter()
        .flat_map(|result| result.diagnostics.iter())
        .map(|d| {
            let severity = match d.severity {
                super::Severity::Error => "error",
                super::Severity::Warning => "warning",
            };
            serde_json::to_string(&(
                d.rule_names[0],
                d.line,
                &d.detail,
                &d.context,
                d.range,
                severity,
            ))
            .expect("entry")
        })
        .collect();
    keys.sort();
    keys
}

#[test]
fn matches_markdownlint_on_every_lint_call_of_its_tests() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/markdownlint");
    let calls: Vec<LintCall> = serde_json::from_str(
        &std::fs::read_to_string(dir.join("lint-calls.json")).expect("lint-calls.json"),
    )
    .expect("parse lint calls");
    let known_text =
        std::fs::read_to_string(dir.join("lint-calls-known-failures.txt")).expect("known");
    let known: Vec<&str> = known_text
        .lines()
        .map(|line| line.split(" #").next().unwrap_or("").trim())
        .filter(|id| !id.is_empty())
        .collect();
    let mut unexpected = Vec::new();
    let mut failing = Vec::new();
    for call in &calls {
        let mut want: Vec<String> = call
            .expect
            .iter()
            .map(|entry| serde_json::to_string(entry).expect("entry"))
            .collect();
        want.sort();
        let got = call_outcome(call);
        if want != got {
            failing.push(call.id.as_str());
            if !known.contains(&call.id.as_str()) {
                unexpected.push(format!("{}\n  want {want:?}\n  got {got:?}", call.id));
            }
        }
    }
    let fixed: Vec<&&str> = known.iter().filter(|id| !failing.contains(id)).collect();
    assert!(
        unexpected.is_empty() && fixed.is_empty(),
        "{} unexpected, fixed {fixed:?}\n{}",
        unexpected.len(),
        unexpected
            .iter()
            .take(15)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}
