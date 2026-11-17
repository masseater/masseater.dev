use std::path::PathBuf;

use rayon::prelude::*;
use tracing::info_span;

use crate::app::transfer::encode;
use crate::entities::import::Edge;
use crate::features::collect_imports::{Scripts, links, uses};
use crate::features::locate_modules::Crates;
use crate::shared::text::has_extension;

const SCRIPTS: [&str; 8] = ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"];
const RUST: [&str; 1] = ["rs"];
const MARKDOWN: [&str; 1] = ["md"];

pub struct Collector {
    root: PathBuf,
}

impl Collector {
    #[must_use]
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    #[must_use]
    pub fn collect(&self, files: &[String]) -> Vec<Edge> {
        let scripts = Scripts::new(&self.root);
        let crates = Crates::new(files);
        let parent = tracing::Span::current();
        files
            .par_iter()
            .filter(|path| {
                has_extension(path, &SCRIPTS)
                    || has_extension(path, &RUST)
                    || has_extension(path, &MARKDOWN)
            })
            .flat_map_iter(|path| {
                let _file =
                    info_span!(parent: &parent, "wism.file", "code.file.path" = path.as_str())
                        .entered();
                let Ok(text) = std::fs::read_to_string(self.root.join(path)) else {
                    return Vec::new();
                };
                if has_extension(path, &MARKDOWN) {
                    links(path, &text)
                } else if has_extension(path, &RUST) {
                    crates
                        .module(path)
                        .map_or_else(Vec::new, |current| uses(path, &text, current))
                } else {
                    scripts.edges(path, &text)
                }
            })
            .collect()
    }
}

#[must_use]
pub fn graph(root: PathBuf, files: Vec<String>) -> Vec<u32> {
    let edges =
        info_span!("wism.collect_imports").in_scope(|| Collector::new(root).collect(&files));
    info_span!("wism.encode", "wism.edges" = edges.len()).in_scope(|| encode(files, &edges))
}

#[cfg(test)]
mod tests {
    use super::Collector;
    use crate::entities::import::Target;
    use crate::shared::fixture::Tree;

    const ENTRIES: [(&str, &str); 7] = [
        (
            "libs/kit/src/entities/job/index.ts",
            "import { run } from \"../../features/run-kit/index.ts\";\n",
        ),
        ("libs/kit/src/features/run-kit/index.ts", ""),
        ("libs/kit/README.md", "# kit\n\n[gone](./gone.md)\n"),
        ("crates/core/Cargo.toml", ""),
        (
            "crates/core/src/entities/note.rs",
            "\n\nuse crate::app::run;\n",
        ),
        ("tools/loose.rs", "use crate::x::y;\n"),
        ("notes.txt", "[x](./y.md)\n"),
    ];

    #[test]
    fn collects_imports_links_and_module_paths() {
        let tree = Tree::new(&ENTRIES);
        let found: Vec<(String, String, usize)> = Collector::new(tree.root.clone())
            .collect(&Tree::names(&ENTRIES))
            .into_iter()
            .map(|edge| {
                let target = match edge.target {
                    Target::File(path) => path,
                    Target::Module(path) => path.join("::"),
                };
                (edge.from, target, edge.line)
            })
            .collect();
        assert_eq!(
            found,
            vec![
                (
                    "libs/kit/src/entities/job/index.ts".to_owned(),
                    "libs/kit/src/features/run-kit/index.ts".to_owned(),
                    1
                ),
                (
                    "libs/kit/README.md".to_owned(),
                    "libs/kit/gone.md".to_owned(),
                    3
                ),
                (
                    "crates/core/src/entities/note.rs".to_owned(),
                    "app::run".to_owned(),
                    3
                ),
            ]
        );
    }

    #[test]
    fn skips_listed_files_that_cannot_be_read() {
        let tree = Tree::new(&[]);
        let found = Collector::new(tree.root.clone()).collect(&["gone.ts".to_owned()]);
        assert_eq!(found.len(), 0);
    }
}
