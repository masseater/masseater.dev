mod config;
#[cfg(test)]
mod conformance;
mod rule;
mod rules;

pub use config::Severity;
pub use rule::{Rule, RuleMeta};
pub use rules::builtin as builtin_rules;

use rayon::prelude::*;
use serde::Serialize;
use serde_json::{Map, Value};
use tracing::info_span;

use crate::shared::source::Source;
use crate::shared::transfer;
use crate::shared::tree::Tree;
use config::Names;
use rule::{Cache, Context, Report};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub line: usize,
    pub rule_names: Vec<&'static str>,
    pub description: &'static str,
    pub detail: Option<String>,
    pub context: Option<String>,
    pub range: Option<(usize, usize)>,
    pub severity: Severity,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileResult {
    pub path: String,
    pub diagnostics: Vec<Diagnostic>,
    #[serde(skip)]
    pub transfer: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Transfer {
    Nothing,
    Text,
    TextAndTree,
}

pub struct Linter {
    rules: Vec<&'static dyn Rule>,
    names: Names,
    config: Map<String, Value>,
    inline: bool,
}

pub struct Input {
    pub path: String,
    pub text: String,
}

impl Linter {
    #[must_use]
    pub fn new(config: Map<String, Value>, inline: bool) -> Self {
        let rules = rules::builtin();
        let names = Names::new(&rules);
        Self {
            rules,
            names,
            config,
            inline,
        }
    }

    #[must_use]
    pub fn lint(&self, path: &str, raw: &str, transfer: Transfer) -> FileResult {
        let _file = info_span!("y8.file", "code.file.path" = path).entered();
        let source = info_span!("y8.read_source").in_scope(|| Source::new(raw));
        let tree = info_span!("y8.parse").in_scope(|| Tree::parse(&source.text, source.body_start));
        let plan = config::plan(
            &source,
            &self.names,
            self.rules.len(),
            &self.config,
            self.inline,
        );
        let cache = Cache::default();
        let mut diagnostics = Vec::new();
        for (index, rule) in self.rules.iter().enumerate() {
            if !plan.used(index) {
                continue;
            }
            let meta = rule.meta();
            let setting = &plan.settings[index];
            let mut report = Report::default();
            let _rule = info_span!("y8.rule", "y8.rule.id" = meta.id()).entered();
            let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                rule.check(
                    &Context {
                        source: &source,
                        tree: &tree,
                        options: &setting.options,
                        cache: &cache,
                    },
                    &mut report,
                );
            }));
            if outcome.is_err() {
                report.findings.clear();
                report
                    .add(source.body_line)
                    .detail("This rule threw an exception");
            }
            diagnostics.extend(
                report
                    .findings
                    .into_iter()
                    .filter(|finding| plan.enabled(index, finding.line))
                    .map(|finding| Diagnostic {
                        line: finding.line + 1,
                        rule_names: meta.names.to_vec(),
                        description: meta.description,
                        detail: finding.detail,
                        context: finding.context.filter(|c| !c.is_empty()),
                        range: finding.range,
                        severity: setting.severity,
                    }),
            );
        }
        diagnostics.sort_by_key(|d| d.line);
        FileResult {
            path: path.to_owned(),
            diagnostics,
            transfer: match transfer {
                Transfer::Nothing => None,
                Transfer::Text => Some(transfer::encode(None, &source.text, &source.line_starts)),
                Transfer::TextAndTree => {
                    Some(info_span!("y8.encode_tree").in_scope(|| {
                        transfer::encode(Some(&tree), &source.text, &source.line_starts)
                    }))
                }
            },
        }
    }

    #[must_use]
    pub fn lint_all(&self, inputs: &[Input], transfer: Transfer) -> Vec<FileResult> {
        let parent = tracing::Span::current();
        inputs
            .par_iter()
            .map(|input| {
                let _guard = parent.enter();
                self.lint(&input.path, &input.text, transfer)
            })
            .collect()
    }
}
