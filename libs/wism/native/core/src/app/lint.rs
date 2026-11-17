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
