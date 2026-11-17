use std::collections::BTreeSet;
use std::path::Path;

use super::check;

const IMPLEMENTED: &[u32] = &[
    2002, 2004, 2005, 2006, 2034, 2046, 2068, 2086, 2168, 2206, 2283, 2288,
];

fn render(code: u32, level: &str, line: usize, column: usize, message: &str) -> String {
    format!("SC{code}:{level}:{line}:{column}: {message}")
}

#[test]
fn matches_shellcheck_on_its_recorded_corpus() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/shellcheck");
    let mut scripts: Vec<_> = std::fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "sh"))
        .collect();
    scripts.sort();
    assert!(scripts.len() > 300);
    let mut failures = Vec::new();
    for script in scripts {
        let source = std::fs::read_to_string(&script).unwrap_or_default();
        let recorded = std::fs::read_to_string(script.with_extension("out")).unwrap_or_default();
        let expected: BTreeSet<String> = recorded
            .lines()
            .filter(|line| {
                line.get(2..6)
                    .and_then(|code| code.parse::<u32>().ok())
                    .is_some_and(|code| IMPLEMENTED.contains(&code))
            })
            .map(str::to_owned)
            .collect();
        let actual: BTreeSet<String> = check(&source)
            .iter()
            .map(|finding| {
                render(
                    finding.code.number(),
                    finding.code.level(),
                    finding.line,
                    finding.column,
                    &finding.message(),
                )
            })
            .collect();
        if expected != actual {
            failures.push(format!(
                "{}\n  missing: {:?}\n  extra: {:?}",
                script.display(),
                expected.difference(&actual).collect::<Vec<_>>(),
                actual.difference(&expected).collect::<Vec<_>>()
            ));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}
