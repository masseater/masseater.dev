use std::collections::HashSet;
use std::path::Path;

use anyhow::{Result, bail};
use kingfisher_scanner::ScanControl;
use kingfisher_scanner::git::{GitEvent, GitInputs, GitMode, GitOptions, GitScope};
use serde::Deserialize;
use tracing::info_span;

use crate::entities::detector::Detector;
use crate::shared::finding::Finding;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GitSource {
    History {
        #[serde(default)]
        bases: Vec<String>,
        head: String,
    },
    Staged,
    Snapshot {
        revision: String,
    },
}

fn is_commit(repository: &gix::Repository, revision: &str) -> bool {
    repository
        .rev_parse_single(revision)
        .ok()
        .and_then(|id| id.object().ok())
        .and_then(|object| object.peel_to_commit().ok())
        .is_some()
}

fn scope_of(root: &Path, source: &GitSource) -> Result<GitScope> {
    Ok(match source {
        GitSource::History { bases, head } => GitScope {
            mode: GitMode::History,
            refs: Some(vec![head.clone()]),
            since_commit: {
                let repository = gix::open(root)?;
                bases
                    .iter()
                    .find(|base| is_commit(&repository, base))
                    .cloned()
            },
            ..GitScope::default()
        },
        GitSource::Staged => GitScope {
            mode: GitMode::Staged,
            ..GitScope::default()
        },
        GitSource::Snapshot { revision } => GitScope {
            mode: GitMode::Snapshot,
            refs: Some(vec![revision.clone()]),
            ..GitScope::default()
        },
    })
}

impl Detector {
    pub fn scan_git(&self, root: &Path, source: &GitSource) -> Result<Vec<Finding>> {
        let _span = info_span!("h56m.scan_git", "h56m.source" = ?source).entered();
        let options = GitOptions {
            discover: false,
            ..GitOptions::default()
        };
        let inputs = GitInputs::open(
            root,
            scope_of(root, source)?,
            options,
            ScanControl::default(),
        )?;
        let mut findings = Vec::new();
        for event in inputs {
            match event? {
                GitEvent::Input(input) => {
                    let commit = input.origins.first().map(|origin| origin.id.to_string());
                    findings.extend(self.scan(&input.path, &input.data)?.into_iter().map(
                        |finding| Finding {
                            commit: commit.clone(),
                            ..finding
                        },
                    ));
                }
                GitEvent::Skipped { path, reason, .. } => {
                    bail!("{path} was not scanned: {reason:?}");
                }
            }
        }
        findings.sort_by(|left, right| {
            (&left.path, left.line, left.column).cmp(&(&right.path, right.line, right.column))
        });
        let mut seen = HashSet::new();
        findings.retain(|finding| {
            seen.insert((
                finding.path.clone(),
                finding.rule.clone(),
                finding.digest.clone(),
            ))
        });
        Ok(findings)
    }
}

#[cfg(test)]
mod tests {
    use std::process::Command;

    use serde_json::json;

    use super::GitSource;
    use crate::entities::detector::Detector;

    const TOKEN: &str = concat!("ghp", "_4Fq8sLm2Zt9Wn6Rb1Yc3Xv7Hk5Pd0Ja8Qe2T");
    const PRESET: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/preset.toml");
    const NONE: [&str; 0] = [];

    fn git(root: &std::path::Path, args: &[&str]) -> String {
        let output = Command::new("git")
            .args([
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@example.invalid",
                "-c",
                "commit.gpgsign=false",
            ])
            .args(args)
            .current_dir(root)
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        String::from_utf8(output.stdout).unwrap().trim().to_owned()
    }

    fn repository() -> (tempfile::TempDir, String) {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path();
        git(root, &["init", "-q", "-b", "main"]);
        std::fs::write(root.join("old.ts"), format!("const t = \"{TOKEN}\";\n")).unwrap();
        git(root, &["add", "."]);
        git(root, &["commit", "-q", "-m", "old"]);
        let base = git(root, &["rev-parse", "HEAD"]);
        (directory, base)
    }

    fn detector() -> Detector {
        Detector::new(&json!({ "extend": { "path": PRESET } }), []).unwrap()
    }

    #[test]
    fn history_covers_only_commits_after_the_first_base_that_resolves() {
        let (directory, base) = repository();
        let root = directory.path();
        std::fs::write(root.join("new.ts"), format!("const u = \"{TOKEN}\";\n")).unwrap();
        git(root, &["add", "."]);
        git(root, &["commit", "-q", "-m", "new"]);
        let head = git(root, &["rev-parse", "HEAD"]);
        let found = detector()
            .scan_git(
                root,
                &GitSource::History {
                    bases: vec!["origin/main".to_owned(), base],
                    head: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].path, "new.ts");
        assert_eq!(found[0].commit.as_deref(), Some(head.as_str()));
    }

    #[test]
    fn staged_and_snapshot_read_the_index_and_a_tree() {
        let (directory, _) = repository();
        let root = directory.path();
        std::fs::write(root.join("staged.ts"), format!("const s = \"{TOKEN}\";\n")).unwrap();
        git(root, &["add", "staged.ts"]);
        let staged = detector().scan_git(root, &GitSource::Staged).unwrap();
        assert_eq!(
            staged.iter().map(|f| f.path.as_str()).collect::<Vec<_>>(),
            ["staged.ts"]
        );
        let snapshot = detector()
            .scan_git(
                root,
                &GitSource::Snapshot {
                    revision: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(
            snapshot.iter().map(|f| f.path.as_str()).collect::<Vec<_>>(),
            ["old.ts"]
        );
    }

    fn commit(root: &std::path::Path, name: &str, text: &str) -> String {
        std::fs::write(root.join(name), text).unwrap();
        git(root, &["add", name]);
        git(root, &["commit", "-q", "-m", name]);
        git(root, &["rev-parse", "HEAD"])
    }

    fn paths(found: &[crate::shared::finding::Finding]) -> Vec<&str> {
        found.iter().map(|finding| finding.path.as_str()).collect()
    }

    #[test]
    fn history_without_a_base_covers_every_commit() {
        let (directory, _) = repository();
        let root = directory.path();
        commit(root, "new.ts", &format!("const u = \"{TOKEN}\";\n"));
        let found = detector()
            .scan_git(
                root,
                &GitSource::History {
                    bases: Vec::new(),
                    head: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(paths(&found), ["new.ts", "old.ts"]);
    }

    #[test]
    fn a_secret_kept_across_commits_is_reported_once_per_file() {
        let (directory, base) = repository();
        let root = directory.path();
        commit(root, "a.ts", &format!("const a = \"{TOKEN}\";\n"));
        commit(root, "a.ts", &format!("// moved\nconst a = \"{TOKEN}\";\n"));
        let found = detector()
            .scan_git(
                root,
                &GitSource::History {
                    bases: vec![base],
                    head: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(paths(&found), ["a.ts"]);
    }

    #[test]
    fn a_removed_secret_still_shows_in_history_but_not_in_the_tree() {
        let (directory, base) = repository();
        let root = directory.path();
        let added = commit(root, "a.ts", &format!("const a = \"{TOKEN}\";\n"));
        commit(root, "a.ts", "const a = process.env.TOKEN;\n");
        let history = detector()
            .scan_git(
                root,
                &GitSource::History {
                    bases: vec![base],
                    head: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(paths(&history), ["a.ts"]);
        assert_eq!(history[0].commit.as_deref(), Some(added.as_str()));
        let tree = detector()
            .scan_git(
                root,
                &GitSource::Snapshot {
                    revision: "HEAD".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(paths(&tree), ["old.ts"]);
    }

    #[test]
    fn staged_ignores_edits_that_are_not_added() {
        let (directory, _) = repository();
        let root = directory.path();
        std::fs::write(
            root.join("unstaged.ts"),
            format!("const u = \"{TOKEN}\";\n"),
        )
        .unwrap();
        std::fs::write(root.join("old.ts"), "const t = 1;\n").unwrap();
        let staged = detector().scan_git(root, &GitSource::Staged).unwrap();
        assert_eq!(paths(&staged), NONE);
    }

    #[test]
    fn a_snapshot_reads_the_given_revision() {
        let (directory, base) = repository();
        let root = directory.path();
        commit(root, "old.ts", "const t = 1;\n");
        let at_base = detector()
            .scan_git(root, &GitSource::Snapshot { revision: base })
            .unwrap();
        assert_eq!(paths(&at_base), ["old.ts"]);
    }

    #[test]
    fn an_unknown_revision_is_an_error() {
        let (directory, _) = repository();
        let root = directory.path();
        let missing = GitSource::Snapshot {
            revision: "no-such-branch".to_owned(),
        };
        assert!(detector().scan_git(root, &missing).is_err());
        let head = GitSource::History {
            bases: Vec::new(),
            head: "no-such-branch".to_owned(),
        };
        assert!(detector().scan_git(root, &head).is_err());
    }

    #[test]
    fn a_directory_that_is_not_a_repository_is_an_error() {
        let directory = tempfile::tempdir().unwrap();
        assert!(
            detector()
                .scan_git(directory.path(), &GitSource::Staged)
                .is_err()
        );
    }

    #[test]
    fn the_source_deserializes_from_its_tagged_json() {
        let parsed: Vec<GitSource> = serde_json::from_value(json!([
            { "type": "history", "head": "HEAD" },
            { "type": "history", "bases": ["origin/main"], "head": "HEAD" },
            { "type": "staged" },
            { "type": "snapshot", "revision": "main" }
        ]))
        .unwrap();
        assert_eq!(
            parsed,
            [
                GitSource::History {
                    bases: Vec::new(),
                    head: "HEAD".to_owned()
                },
                GitSource::History {
                    bases: vec!["origin/main".to_owned()],
                    head: "HEAD".to_owned()
                },
                GitSource::Staged,
                GitSource::Snapshot {
                    revision: "main".to_owned()
                }
            ]
        );
    }
}
