mod added;

use std::collections::{HashMap, HashSet};
use std::path::Path;

use anyhow::{Context, Result};
use gix::ObjectId;
use gix::index::entry::{Mode, Stage};
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

struct Blob {
    path: String,
    id: ObjectId,
    parent: Option<ObjectId>,
    commit: Option<ObjectId>,
}

type Changed = (String, Option<ObjectId>, ObjectId);

fn commit_of(repository: &gix::Repository, revision: &str) -> Result<ObjectId> {
    Ok(repository
        .rev_parse_single(revision)
        .with_context(|| format!("unknown revision {revision:?}"))?
        .object()?
        .peel_to_commit()
        .with_context(|| format!("{revision:?} is not a commit"))?
        .id)
}

fn tree_of(repository: &gix::Repository, commit: ObjectId) -> Result<ObjectId> {
    Ok(repository.find_commit(commit)?.tree_id()?.detach())
}

type Entries = HashMap<Vec<u8>, (bool, ObjectId)>;

type TreeEntry = (Vec<u8>, bool, bool, ObjectId);

fn entries_of(repository: &gix::Repository, tree: ObjectId) -> Result<Vec<TreeEntry>> {
    let tree = repository.find_tree(tree)?;
    Ok(tree
        .decode()?
        .entries
        .iter()
        .map(|entry| {
            (
                entry.filename.to_vec(),
                entry.mode.is_tree(),
                entry.mode.is_blob(),
                entry.oid.to_owned(),
            )
        })
        .collect())
}

fn joined(prefix: &str, name: &[u8]) -> String {
    let name = String::from_utf8_lossy(name);
    if prefix.is_empty() {
        name.into_owned()
    } else {
        format!("{prefix}/{name}")
    }
}

fn changed_blobs(
    repository: &gix::Repository,
    old: Option<ObjectId>,
    new: ObjectId,
    prefix: &str,
    out: &mut Vec<Changed>,
) -> Result<()> {
    if old == Some(new) {
        return Ok(());
    }
    let before: Entries = match old {
        Some(old) => entries_of(repository, old)?
            .into_iter()
            .map(|(name, tree, _, id)| (name, (tree, id)))
            .collect(),
        None => HashMap::new(),
    };
    for (name, tree, blob, id) in entries_of(repository, new)? {
        let previous = before.get(&name).copied();
        if tree {
            let old_tree = previous.filter(|(was_tree, _)| *was_tree).map(|(_, id)| id);
            changed_blobs(repository, old_tree, id, &joined(prefix, &name), out)?;
        } else if blob && previous != Some((false, id)) {
            let parent = previous
                .filter(|(was_tree, _)| !*was_tree)
                .map(|(_, id)| id);
            out.push((joined(prefix, &name), parent, id));
        }
    }
    Ok(())
}

fn history(repository: &gix::Repository, bases: &[String], head: &str) -> Result<Vec<Blob>> {
    let head = commit_of(repository, head)?;
    let hidden: Vec<ObjectId> = bases
        .iter()
        .find_map(|base| commit_of(repository, base).ok())
        .into_iter()
        .collect();
    let mut commits = Vec::new();
    for info in repository.rev_walk([head]).with_hidden(hidden).all()? {
        commits.push(info?.id);
    }
    commits.reverse();
    let mut seen = HashSet::new();
    let mut blobs = Vec::new();
    for commit in commits {
        let parent = repository
            .find_commit(commit)?
            .parent_ids()
            .next()
            .map(gix::Id::detach);
        let parent_tree = parent
            .map(|parent| tree_of(repository, parent))
            .transpose()?;
        let mut changed = Vec::new();
        changed_blobs(
            repository,
            parent_tree,
            tree_of(repository, commit)?,
            "",
            &mut changed,
        )?;
        for (path, parent, id) in changed {
            if seen.insert((path.clone(), parent, id)) {
                blobs.push(Blob {
                    path,
                    id,
                    parent,
                    commit: Some(commit),
                });
            }
        }
    }
    Ok(blobs)
}

fn snapshot(repository: &gix::Repository, revision: &str) -> Result<Vec<Blob>> {
    let mut changed = Vec::new();
    let tree = tree_of(repository, commit_of(repository, revision)?)?;
    changed_blobs(repository, None, tree, "", &mut changed)?;
    Ok(changed
        .into_iter()
        .map(|(path, _, id)| Blob {
            path,
            id,
            parent: None,
            commit: None,
        })
        .collect())
}

fn staged(repository: &gix::Repository) -> Result<Vec<Blob>> {
    let mut committed = Vec::new();
    if let Ok(head) = commit_of(repository, "HEAD") {
        changed_blobs(
            repository,
            None,
            tree_of(repository, head)?,
            "",
            &mut committed,
        )?;
    }
    let committed: HashMap<String, ObjectId> = committed
        .into_iter()
        .map(|(path, _, id)| (path, id))
        .collect();
    let index = repository.open_index()?;
    Ok(index
        .entries()
        .iter()
        .filter(|entry| entry.stage() == Stage::Unconflicted)
        .filter(|entry| matches!(entry.mode, Mode::FILE | Mode::FILE_EXECUTABLE))
        .map(|entry| (entry.path(&index).to_string(), entry.id))
        .filter(|(path, id)| committed.get(path) != Some(id))
        .map(|(path, id)| Blob {
            parent: committed.get(&path).copied(),
            path,
            id,
            commit: None,
        })
        .collect())
}

const BINARY_PROBE: usize = 8_000;

impl Detector {
    fn scan_added(&self, repository: &gix::Repository, blob: &Blob) -> Result<Vec<Finding>> {
        let data = repository.find_object(blob.id)?.detach().data;
        let Some(parent) = blob.parent else {
            return self.scan(&blob.path, &data);
        };
        let old = repository.find_object(parent)?.detach().data;
        if old[..old.len().min(BINARY_PROBE)].contains(&0) {
            return self.scan(&blob.path, &data);
        }
        let mut fragments = Vec::new();
        added::additions(&old, &data, |raw, line| {
            fragments.push((
                raw.as_ptr() as usize - data.as_ptr() as usize,
                raw.len(),
                line,
            ));
        });
        let mut findings = Vec::new();
        for (start, length, line) in fragments {
            findings.extend(
                self.scan(&blob.path, &data[start..start + length])?
                    .into_iter()
                    .map(|finding| Finding {
                        line: finding.line + line - 1,
                        end_line: finding.end_line + line - 1,
                        start_offset: finding.start_offset + start,
                        end_offset: finding.end_offset + start,
                        ..finding
                    }),
            );
        }
        Ok(findings)
    }

    pub fn scan_git(&self, root: &Path, source: &GitSource) -> Result<Vec<Finding>> {
        let _span = info_span!("h56m.scan_git", "h56m.source" = ?source).entered();
        let repository = gix::open(root)?;
        let blobs = match source {
            GitSource::History { bases, head } => history(&repository, bases, head)?,
            GitSource::Staged => staged(&repository)?,
            GitSource::Snapshot { revision } => snapshot(&repository, revision)?,
        };
        let mut findings = Vec::new();
        for blob in blobs {
            let commit = blob.commit.map(|id| id.to_string());
            findings.extend(
                self.scan_added(&repository, &blob)?
                    .into_iter()
                    .map(|finding| Finding {
                        commit: commit.clone(),
                        ..finding
                    }),
            );
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

    fn history_from(root: &std::path::Path, base: String) -> Vec<crate::shared::finding::Finding> {
        detector()
            .scan_git(
                root,
                &GitSource::History {
                    bases: vec![base],
                    head: "HEAD".to_owned(),
                },
            )
            .unwrap()
    }

    #[test]
    fn history_reports_only_lines_that_the_commits_add() {
        let (directory, base) = repository();
        let root = directory.path();
        commit(
            root,
            "old.ts",
            &format!("// note\nconst t = \"{TOKEN}\";\n"),
        );
        assert_eq!(paths(&history_from(root, base)), NONE);
    }

    #[test]
    fn an_added_secret_keeps_its_line_and_column_in_the_file() {
        let (directory, base) = repository();
        let root = directory.path();
        commit(root, "a.ts", "a\nb\nc\n");
        commit(root, "a.ts", &format!("a\nb\nconst t = \"{TOKEN}\";\nc\n"));
        let found = history_from(root, base);
        assert_eq!(paths(&found), ["a.ts"]);
        assert_eq!((found[0].line, found[0].column), (3, 12));
        assert_eq!((found[0].end_line, found[0].end_column), (3, 51));
    }

    #[test]
    fn a_match_that_needs_an_unchanged_line_is_not_reported() {
        let detector = Detector::new(
            &json!({ "rules": [{
                "id": "paired-key",
                "regex": "key:\\n\"(\\w{12})\"",
                "keywords": ["key"]
            }] }),
            [],
        )
        .unwrap();
        let (directory, _) = repository();
        let root = directory.path();
        let base = commit(root, "pair.yml", "key:\n\"aaaaaaaaaaaa\"\n");
        commit(root, "pair.yml", "key:\n\"bbbbbbbbbbbb\"\n");
        let history = GitSource::History {
            bases: vec![base],
            head: "HEAD".to_owned(),
        };
        assert_eq!(paths(&detector.scan_git(root, &history).unwrap()), NONE);
        let tree = GitSource::Snapshot {
            revision: "HEAD".to_owned(),
        };
        assert_eq!(
            paths(&detector.scan_git(root, &tree).unwrap()),
            ["pair.yml"]
        );
    }

    #[test]
    fn staged_reports_only_lines_that_the_index_adds() {
        let (directory, _) = repository();
        let root = directory.path();
        std::fs::write(
            root.join("old.ts"),
            format!("const t = \"{TOKEN}\";\nconst u = 1;\n"),
        )
        .unwrap();
        git(root, &["add", "old.ts"]);
        assert_eq!(
            paths(&detector().scan_git(root, &GitSource::Staged).unwrap()),
            NONE
        );
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
