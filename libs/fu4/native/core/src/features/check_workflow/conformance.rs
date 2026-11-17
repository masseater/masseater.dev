use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use regex::Regex;

use super::{Context, check};

const PORTED: &[&str] = &[
    "syntax-check",
    "credentials",
    "shell-name",
    "job-needs",
    "matrix",
    "env-var",
    "events",
    "id",
    "glob",
    "permissions",
    "runner-label",
    "deprecated-commands",
    "if-cond",
];
const SKIPPED: &[&str] = &["shellcheck", "pyflakes"];

fn kind_of(line: &str) -> Option<&str> {
    if line.starts_with('/') && !line.ends_with("\\]/") {
        return Some(if line.contains(" label \"") {
            "runner-label"
        } else {
            "expression"
        });
    }
    let body = line
        .strip_suffix("\\]/")
        .or_else(|| line.strip_suffix(']'))?;
    let open = body.rfind('[')?;
    Some(body[open + 1..].trim_end_matches('\\')).filter(|kind| !kind.is_empty())
}

fn matches(want: &str, have: &str) -> bool {
    if want.len() > 1 && want.starts_with('/') && want.ends_with('/') {
        return Regex::new(&want[1..want.len() - 1]).is_ok_and(|pattern| pattern.is_match(have));
    }
    want == have
}

fn workflows(dir: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = std::fs::read_dir(dir)
        .expect("fixture directory")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && matches!(
                    path.extension().and_then(|e| e.to_str()),
                    Some("yaml" | "yml")
                )
        })
        .collect();
    files.sort();
    files
}

fn lint(dir: &Path, file: &Path) -> Vec<String> {
    let context = Context {
        path: "test.yaml".to_owned(),
        root: Some(dir.to_path_buf()),
    };
    let source = std::fs::read_to_string(file).expect("workflow");
    check(&context, &source)
        .into_iter()
        .filter(|d| PORTED.contains(&d.kind.as_str()))
        .map(|d| {
            format!(
                "test.yaml:{}:{}: {} [{}]",
                d.pos.line, d.pos.col, d.message, d.kind
            )
        })
        .collect()
}

fn fixtures() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/actionlint")
}

fn known_failures() -> BTreeSet<String> {
    std::fs::read_to_string(fixtures().join("../actionlint-known-failures.txt"))
        .unwrap_or_default()
        .lines()
        .map(|line| {
            line.split(" #")
                .next()
                .unwrap_or_default()
                .trim()
                .to_owned()
        })
        .filter(|line| !line.is_empty())
        .collect()
}

#[test]
fn matches_actionlint_on_its_error_fixtures() {
    let known = known_failures();
    let mut failures = BTreeSet::new();
    let mut report = Vec::new();
    for group in ["err", "examples"] {
        let dir = fixtures().join(group);
        for file in workflows(&dir) {
            let name = file
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_owned();
            if SKIPPED.iter().any(|skip| name.contains(skip)) {
                continue;
            }
            let expected: Vec<String> = std::fs::read_to_string(file.with_extension("out"))
                .expect("out file")
                .lines()
                .filter(|line| kind_of(line).is_some_and(|kind| PORTED.contains(&kind)))
                .map(str::to_owned)
                .collect();
            let actual = lint(&dir, &file);
            let same = expected.len() == actual.len()
                && expected.iter().zip(&actual).all(|(w, h)| matches(w, h));
            if !same {
                let id = format!("{group}/{name}");
                if !known.contains(&id) {
                    report.push(format!("{id}\n  want {expected:#?}\n  have {actual:#?}"));
                }
                failures.insert(id);
            }
        }
    }
    let fixed: Vec<&String> = known.difference(&failures).collect();
    assert!(
        report.is_empty() && fixed.is_empty(),
        "{} unexpected mismatches, {} known failures now pass {fixed:?}\n{}",
        report.len(),
        fixed.len(),
        report.join("\n")
    );
}

#[test]
fn accepts_actionlint_ok_fixtures() {
    let dir = fixtures().join("ok");
    let mut report = Vec::new();
    for file in workflows(&dir) {
        let name = file
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_owned();
        if SKIPPED.iter().any(|skip| name.contains(skip)) {
            continue;
        }
        let actual = lint(&dir, &file);
        if !actual.is_empty() {
            report.push(format!("{name}: {actual:#?}"));
        }
    }
    assert!(report.is_empty(), "{}", report.join("\n"));
}
