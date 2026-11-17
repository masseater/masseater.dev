use std::path::PathBuf;

use rayon::prelude::*;
use serde::Serialize;
use tracing::info_span;

use crate::entities::import::Edge;
use crate::entities::layout::{Layout, Position};
use crate::features::collect_imports::{Scripts, links, module_of, uses};
use crate::features::{check_imports, check_placement};
use crate::shared::config::Config;
use crate::shared::diagnostic::{Diagnostic, Finding};
use crate::shared::text::{has_extension, inside};

const SCRIPTS: [&str; 8] = ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"];
const RUST: [&str; 1] = ["rs"];
const MARKDOWN: [&str; 1] = ["md"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub path: String,
    pub kind: String,
    pub dir: String,
    pub layer: Option<String>,
    pub slice: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub diagnostics: Vec<Diagnostic>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nodes: Option<Vec<Node>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edges: Option<Vec<Edge>>,
}

pub struct Linter {
    config: Config,
    root: PathBuf,
}

enum Source {
    Script,
    Rust(Vec<String>),
    Markdown,
}

fn layered(position: &Position) -> bool {
    matches!(position, Position::Layer { .. } | Position::Root)
}

fn source_of(layout: &Layout, path: &str) -> Option<Source> {
    if has_extension(path, &MARKDOWN) {
        return Some(Source::Markdown);
    }
    let script = has_extension(path, &SCRIPTS);
    let rust = has_extension(path, &RUST);
    if !script && !rust {
        return None;
    }
    layout.located(path).into_iter().find_map(|located| {
        if !layered(&located.position) {
            return None;
        }
        if script {
            return Some(Source::Script);
        }
        let layers = layout.kind(located.instance).layers.as_ref()?;
        let inner = layout.inner(located.instance, path)?;
        let rest = inside(inner, &layers.dir)?;
        Some(Source::Rust(module_of(rest)))
    })
}

fn nodes_of(layout: &Layout, files: &[String]) -> Vec<Node> {
    files
        .iter()
        .flat_map(|path| {
            layout
                .located(path)
                .into_iter()
                .filter_map(move |located| match located.position {
                    Position::Layer { layer, slice, .. } => Some(Node {
                        path: path.clone(),
                        kind: layout.kind(located.instance).name.clone(),
                        dir: layout.instances[located.instance].dir.clone(),
                        layer: Some(layer),
                        slice,
                    }),
                    _ => None,
                })
        })
        .collect()
}

impl Linter {
    #[must_use]
    pub fn new(config: Config, root: PathBuf) -> Self {
        Self { config, root }
    }

    fn edges(&self, layout: &Layout, files: &[String]) -> Vec<Edge> {
        let scripts = Scripts::new(&self.root);
        let parent = tracing::Span::current();
        files
            .par_iter()
            .filter_map(|path| source_of(layout, path).map(|source| (path, source)))
            .flat_map_iter(|(path, source)| {
                let _file =
                    info_span!(parent: &parent, "wism.file", "code.file.path" = path.as_str())
                        .entered();
                let Ok(text) = std::fs::read_to_string(self.root.join(path)) else {
                    return Vec::new();
                };
                match source {
                    Source::Script => scripts.edges(path, &text),
                    Source::Rust(current) => uses(path, &text, current),
                    Source::Markdown => links(path, &text),
                }
            })
            .collect()
    }

    fn diagnostic(&self, finding: Finding) -> Option<Diagnostic> {
        let severity = self.config.severity(finding.rule)?;
        Some(Diagnostic {
            path: finding.path,
            line: finding.line,
            column: finding.column,
            rule: finding.rule,
            message: finding.message,
            severity,
        })
    }

    pub fn lint(&self, files: Vec<String>, keep_graph: bool) -> Result<Report, String> {
        let layout = info_span!("wism.layout").in_scope(|| Layout::new(&self.config, files))?;
        let placed = info_span!("wism.check_placement")
            .in_scope(|| check_placement::check(&layout, &layout.list))?;
        let edges =
            info_span!("wism.collect_imports").in_scope(|| self.edges(&layout, &layout.list));
        let imported =
            info_span!("wism.check_imports").in_scope(|| check_imports::check(&layout, &edges));
        let mut diagnostics: Vec<Diagnostic> = placed
            .into_iter()
            .chain(imported)
            .filter_map(|finding| self.diagnostic(finding))
            .collect();
        diagnostics.sort_by(|left, right| {
            (&left.path, left.line, left.column, left.rule).cmp(&(
                &right.path,
                right.line,
                right.column,
                right.rule,
            ))
        });
        diagnostics.dedup();
        Ok(Report {
            diagnostics,
            nodes: keep_graph.then(|| nodes_of(&layout, &layout.list)),
            edges: keep_graph.then_some(edges),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::Linter;
    use crate::shared::diagnostic::Severity;
    use crate::shared::fixture::{Tree, config};

    const ENTRIES: [(&str, &str); 9] = [
        ("libs/kit/package.json", "{}"),
        ("libs/kit/kit.ts", ""),
        (
            "libs/kit/src/entities/job/index.ts",
            "import { run } from \"../../features/run-kit/index.ts\";\n",
        ),
        (
            "libs/kit/src/features/run-kit/index.ts",
            "export { job } from \"../../entities/job/index.ts\";\n",
        ),
        ("libs/kit/README.md", "# kit\n\n[gone](./gone.md)\n"),
        ("crates/core/Cargo.toml", ""),
        ("crates/core/src/lib.rs", "mod entities;\n"),
        (
            "crates/core/src/entities/note.rs",
            "\n\nuse crate::app::run;\n",
        ),
        ("crates/core/src/app.rs", "pub fn run() {}\n"),
    ];

    fn lint(rules: serde_json::Value, keep_graph: bool) -> super::Report {
        let tree = Tree::new(&ENTRIES);
        let mut config = config();
        config.rules = serde_json::from_value(rules).expect("the rules are valid");
        Linter::new(config, tree.root.clone())
            .lint(Tree::names(&ENTRIES), keep_graph)
            .expect("the lint runs")
    }

    #[test]
    fn reports_every_kind_of_finding_sorted_by_position() {
        let report = lint(serde_json::json!({}), false);
        let found: Vec<(String, usize, &str)> = report
            .diagnostics
            .iter()
            .map(|found| (found.path.clone(), found.line, found.rule))
            .collect();
        assert_eq!(
            found,
            vec![
                (
                    "crates/core/src/entities/note.rs".to_owned(),
                    3,
                    "layer-import"
                ),
                ("libs/kit/README.md".to_owned(), 3, "link-target"),
                ("libs/kit/kit.ts".to_owned(), 1, "placement"),
                (
                    "libs/kit/src/entities/job/index.ts".to_owned(),
                    1,
                    "layer-import"
                ),
            ]
        );
        assert!(report.nodes.is_none());
        assert!(report.edges.is_none());
    }

    #[test]
    fn follows_rule_severities() {
        let report = lint(
            serde_json::json!({ "layer-import": "off", "placement": "warn" }),
            false,
        );
        let found: Vec<(&str, Severity)> = report
            .diagnostics
            .iter()
            .map(|found| (found.rule, found.severity))
            .collect();
        assert_eq!(
            found,
            vec![
                ("link-target", Severity::Error),
                ("placement", Severity::Warn)
            ]
        );
    }

    #[test]
    fn keeps_the_graph_when_asked() {
        let report = lint(serde_json::json!({}), true);
        let nodes = report.nodes.expect("the nodes are kept");
        let edges = report.edges.expect("the edges are kept");
        assert!(
            nodes
                .iter()
                .any(|node| node.path == "libs/kit/src/entities/job/index.ts"
                    && node.kind == "workspace"
                    && node.dir == "libs/kit"
                    && node.layer.as_deref() == Some("entities")
                    && node.slice.as_deref() == Some("job"))
        );
        assert_eq!(edges.len(), 4);
    }

    #[test]
    fn skips_listed_files_that_cannot_be_read() {
        let tree = Tree::new(&[("libs/kit/package.json", "{}")]);
        let report = Linter::new(config(), tree.root.clone())
            .lint(
                vec![
                    "libs/kit/package.json".to_owned(),
                    "libs/kit/src/app/index.ts".to_owned(),
                ],
                false,
            )
            .expect("the lint runs");
        assert_eq!(report.diagnostics.len(), 0);
    }
}
