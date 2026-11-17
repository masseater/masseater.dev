use std::collections::BTreeMap;
use std::path::Path;

use y8_core::{Input, Linter};

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
    let results = Linter::new(serde_json::Map::new(), true).lint_all(&inputs, false);
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
