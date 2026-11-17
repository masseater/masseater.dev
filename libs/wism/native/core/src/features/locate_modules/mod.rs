use std::collections::HashSet;

use crate::shared::text::{inside, parent};

const ROOTS: [&str; 2] = ["lib", "main"];
const BINARIES: &str = "bin";
const MODULE_INDEX: &str = "mod";
const MANIFEST: &str = "Cargo.toml";
const SOURCES: &str = "src";

#[must_use]
pub fn module_of(rest: &str) -> Vec<String> {
    let trimmed = rest.strip_suffix(".rs").unwrap_or(rest);
    let mut parts: Vec<String> = trimmed.split('/').map(str::to_owned).collect();
    if parts.first().is_some_and(|first| first == BINARIES) {
        return Vec::new();
    }
    if parts.len() == 1 && ROOTS.contains(&parts[0].as_str()) {
        return Vec::new();
    }
    if parts.last().is_some_and(|last| last == MODULE_INDEX) {
        parts.pop();
    }
    parts
}

pub struct Crates {
    dirs: HashSet<String>,
}

impl Crates {
    #[must_use]
    pub fn new(files: &[String]) -> Self {
        let dirs = files
            .iter()
            .filter(|file| file.rsplit('/').next() == Some(MANIFEST))
            .map(|file| parent(file).to_owned())
            .collect();
        Self { dirs }
    }

    #[must_use]
    pub fn module(&self, path: &str) -> Option<Vec<String>> {
        let mut dir = parent(path);
        loop {
            if self.dirs.contains(dir) {
                let rest = inside(path, dir)?;
                return Some(inside(rest, SOURCES).map_or_else(Vec::new, module_of));
            }
            if dir.is_empty() {
                return None;
            }
            dir = parent(dir);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Crates, module_of};
    use crate::shared::fixture::files;

    fn crates() -> Crates {
        Crates::new(&files(&[
            "Cargo.toml",
            "crates/core/Cargo.toml",
            "crates/core/src/lib.rs",
        ]))
    }

    #[test]
    fn maps_files_to_module_paths() {
        assert_eq!(module_of("lib.rs"), Vec::<String>::new());
        assert_eq!(module_of("bin/cli.rs"), Vec::<String>::new());
        assert_eq!(module_of("features/sync/mod.rs"), vec!["features", "sync"]);
        assert_eq!(module_of("entities/note.rs"), vec!["entities", "note"]);
    }

    #[test]
    fn finds_the_module_path_inside_the_nearest_crate() {
        let crates = crates();
        assert_eq!(
            crates.module("crates/core/src/features/sync/mod.rs"),
            Some(vec!["features".to_owned(), "sync".to_owned()])
        );
        assert_eq!(
            crates.module("crates/core/src/entities/note.rs"),
            Some(vec!["entities".to_owned(), "note".to_owned()])
        );
        assert_eq!(crates.module("crates/core/src/lib.rs"), Some(Vec::new()));
        assert_eq!(crates.module("src/main.rs"), Some(Vec::new()));
    }

    #[test]
    fn treats_files_outside_src_as_their_own_crate_root() {
        let crates = crates();
        assert_eq!(crates.module("crates/core/tests/run.rs"), Some(Vec::new()));
        assert_eq!(crates.module("crates/core/build.rs"), Some(Vec::new()));
    }

    #[test]
    fn finds_no_module_outside_every_crate() {
        let crates = Crates::new(&files(&["crates/core/Cargo.toml"]));
        assert_eq!(crates.module("tools/x.rs"), None);
    }
}
