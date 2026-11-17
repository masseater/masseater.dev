use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use regex::Regex;

use super::{CONFIG_NAME, Config, Context, Project, check};
use crate::shared::yaml::{Kind, Node, load};

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
    "action",
    "workflow-call",
    "expression",
    "shellcheck",
];
const SKIPPED: &[&str] = &["pyflakes"];

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

fn is_ported(kind: &str) -> bool {
    kind.trim_start_matches('(')
        .trim_end_matches(')')
        .split('|')
        .any(|k| PORTED.contains(&k))
}

fn go_literal_braces(source: &str) -> String {
    let chars: Vec<char> = source.chars().collect();
    let mut out = String::new();
    for (i, c) in chars.iter().enumerate() {
        let escaped = i > 0 && chars[i - 1] == '\\';
        let repetition = match c {
            '{' => chars.get(i + 1).is_some_and(char::is_ascii_digit),
            '}' => i > 0 && (chars[i - 1].is_ascii_digit() || chars[i - 1] == ','),
            _ => true,
        };
        if matches!(c, '{' | '}') && !escaped && !repetition {
            out.push('\\');
        }
        out.push(*c);
    }
    out
}

fn matches(want: &str, have: &str) -> bool {
    if want.len() > 1 && want.starts_with('/') && want.ends_with('/') {
        let source = &want[1..want.len() - 1];
        let pattern = Regex::new(source).or_else(|_| Regex::new(&go_literal_braces(source)));
        return pattern.is_ok_and(|pattern| pattern.is_match(have));
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

fn lint(dir: &Path, file: &Path, shellcheck: bool) -> Vec<String> {
    let context = Context {
        path: "test.yaml".to_owned(),
        project: Some(Project::new(dir.to_path_buf(), &Config::default()).expect("config")),
    };
    let source = std::fs::read_to_string(file).expect("workflow");
    check(&context, &source)
        .into_iter()
        .filter(|d| PORTED.contains(&d.kind.as_str()))
        .filter(|d| shellcheck || d.kind != "shellcheck")
        .map(|d| {
            format!(
                "test.yaml:{}:{}: {} [{}]",
                d.pos.line,
                d.pos.col,
                normalize(&d.message),
                d.kind
            )
        })
        .collect()
}

fn normalize(message: &str) -> String {
    message
        .replace(
            &format!("variables in {CONFIG_NAME} are"),
            "variables in actionlint.yaml are",
        )
        .replace(
            &format!("is empty in {CONFIG_NAME}."),
            "is empty in actionlint.yaml.",
        )
        .replace(CONFIG_NAME, "actionlint.yaml config file")
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
                .filter(|line| kind_of(line).is_some_and(is_ported))
                .map(str::to_owned)
                .collect();
            let actual = lint(&dir, &file, name.contains("shellcheck"));
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
    let fixed: Vec<&String> = known
        .difference(&failures)
        .filter(|id| id.starts_with("err/") || id.starts_with("examples/"))
        .collect();
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
    let known = known_failures();
    let dir = fixtures().join("ok");
    let mut report = Vec::new();
    let mut failures = BTreeSet::new();
    for file in workflows(&dir) {
        let name = file
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_owned();
        if SKIPPED.iter().any(|skip| name.contains(skip)) {
            continue;
        }
        let actual = lint(&dir, &file, true);
        let id = format!(
            "ok/{}",
            name.trim_end_matches(".yaml").trim_end_matches(".yml")
        );
        if !actual.is_empty() {
            if !known.contains(&id) {
                report.push(format!("{name}: {actual:#?}"));
            }
            failures.insert(id);
        }
    }
    let fixed: Vec<&String> = known
        .iter()
        .filter(|id| id.starts_with("ok/") && !failures.contains(*id))
        .collect();
    assert!(
        report.is_empty() && fixed.is_empty(),
        "known failures now pass {fixed:?}\n{}",
        report.join("\n")
    );
}

fn expected_lines(out: &Path) -> Vec<String> {
    std::fs::read_to_string(out)
        .expect("out file")
        .lines()
        .filter(|line| kind_of(line).is_some_and(is_ported))
        .map(str::to_owned)
        .collect()
}

fn camel(key: &str) -> String {
    let mut out = String::new();
    let mut upper = false;
    for c in key.chars() {
        if c == '-' {
            upper = true;
        } else if upper {
            out.extend(c.to_uppercase());
            upper = false;
        } else {
            out.push(c);
        }
    }
    out
}

fn to_json(node: &Node, top: bool) -> serde_json::Value {
    match node.kind {
        Kind::Mapping => serde_json::Value::Object(
            node.pairs()
                .map(|(k, v)| {
                    let key = if top {
                        camel(&k.value)
                    } else {
                        k.value.clone()
                    };
                    let nested = top || k.value == "self-hosted-runner";
                    (
                        key,
                        to_json(v, nested && !k.value.contains('/') && k.value != "paths"),
                    )
                })
                .collect(),
        ),
        Kind::Sequence => {
            serde_json::Value::Array(node.content.iter().map(|n| to_json(n, false)).collect())
        }
        _ if node.is_null() => serde_json::Value::Null,
        _ => serde_json::Value::String(node.value.clone()),
    }
}

fn project_config(dir: &Path) -> Config {
    let Ok(source) = std::fs::read_to_string(dir.join("actionlint.yaml")) else {
        return Config::default();
    };
    let root = load(&source).root.expect("config root");
    serde_json::from_value(to_json(&root, true)).expect("config shape")
}

fn workflow_files(dir: &Path, prefix: &str, out: &mut Vec<(String, PathBuf)>) {
    let mut entries: Vec<PathBuf> = std::fs::read_dir(dir)
        .expect("workflows")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .collect();
    entries.sort();
    for path in entries {
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_owned();
        if path.is_dir() {
            workflow_files(&path, &format!("{prefix}{name}/"), out);
        } else if matches!(
            path.extension().and_then(|e| e.to_str()),
            Some("yaml" | "yml")
        ) {
            out.push((format!("{prefix}{name}"), path));
        }
    }
}

fn lint_project(dir: &Path, name: &str) -> Vec<String> {
    let project = Project::new(dir.to_path_buf(), &project_config(dir)).expect("config");
    let shown_root = dir.to_string_lossy().into_owned();
    let mut lines = Vec::new();
    let mut files = Vec::new();
    workflow_files(&dir.join("workflows"), "", &mut files);
    for (file_name, file) in files {
        let context = Context {
            path: format!("workflows/{file_name}"),
            project: Some(std::sync::Arc::clone(&project)),
        };
        let source = std::fs::read_to_string(&file).expect("workflow");
        lines.extend(
            check(&context, &source)
                .into_iter()
                .filter(|d| PORTED.contains(&d.kind.as_str()))
                .map(|d| {
                    format!(
                        "workflows/{file_name}:{}:{}: {} [{}]",
                        d.pos.line,
                        d.pos.col,
                        normalize(&d.message)
                            .replace(&shown_root, &format!("testdata/projects/{name}")),
                        d.kind
                    )
                }),
        );
    }
    lines
}

#[test]
fn matches_actionlint_on_its_project_fixtures() {
    let known = known_failures();
    let root = fixtures().join("projects");
    let mut names: Vec<String> = std::fs::read_dir(&root)
        .expect("projects")
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .filter_map(|entry| entry.file_name().to_str().map(str::to_owned))
        .collect();
    names.sort();
    let mut failures = BTreeSet::new();
    let mut report = Vec::new();
    for name in names {
        let dir = root.join(&name);
        let expected = expected_lines(&root.join(format!("{name}.out")));
        let actual = lint_project(&dir, &name);
        let same = expected.len() == actual.len()
            && expected.iter().zip(&actual).all(|(w, h)| matches(w, h));
        if !same {
            let id = format!("projects/{name}");
            if !known.contains(&id) {
                report.push(format!("{id}\n  want {expected:#?}\n  have {actual:#?}"));
            }
            failures.insert(id);
        }
    }
    let fixed: Vec<&String> = known
        .iter()
        .filter(|id| id.starts_with("projects/"))
        .filter(|id| !failures.contains(*id))
        .collect();
    assert!(
        report.is_empty() && fixed.is_empty(),
        "{} unexpected mismatches, {} known failures now pass {fixed:?}\n{}",
        report.len(),
        fixed.len(),
        report.join("\n")
    );
}
