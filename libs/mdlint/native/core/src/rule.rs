use std::cell::OnceCell;
use std::collections::HashSet;

use serde_json::Value;

use crate::rules::blocks::CodeBlock;
use crate::rules::common::Heading;
use crate::rules::links::ReferenceData;
use crate::rules::lists::List;
use crate::rules::tables::Table;

use crate::source::Source;
use crate::tree::Tree;

pub struct RuleMeta {
    pub names: &'static [&'static str],
    pub description: &'static str,
    pub tags: &'static [&'static str],
}

impl RuleMeta {
    #[must_use]
    pub fn id(&self) -> &'static str {
        self.names[0]
    }
}

pub trait Rule: Send + Sync {
    fn meta(&self) -> &'static RuleMeta;
    fn check(&self, ctx: &Context<'_>, report: &mut Report);
}

#[derive(Default)]
pub struct Cache<'a> {
    pub headings: OnceCell<Vec<Heading>>,
    pub code_blocks: OnceCell<Vec<CodeBlock<'a>>>,
    pub math: OnceCell<Vec<(usize, usize)>>,
    pub segments: OnceCell<Vec<(u32, usize, usize)>>,
    pub references: OnceCell<ReferenceData>,
    pub tables: OnceCell<Vec<Table>>,
    pub lists: OnceCell<Vec<List>>,
    pub ignored_blocks: OnceCell<HashSet<usize>>,
    pub definition_lines: OnceCell<HashSet<usize>>,
}

pub struct Context<'a> {
    pub source: &'a Source,
    pub tree: &'a Tree,
    pub options: &'a Value,
    pub cache: &'a Cache<'a>,
}

impl Context<'_> {
    #[must_use]
    pub fn option(&self, key: &str) -> Option<&Value> {
        self.options.get(key).filter(|v| !v.is_null())
    }

    #[must_use]
    pub fn str_option<'b>(&'b self, key: &str, default: &'b str) -> &'b str {
        self.option(key).and_then(Value::as_str).unwrap_or(default)
    }

    #[must_use]
    pub fn uint_option(&self, key: &str, default: u64) -> u64 {
        self.option(key)
            .and_then(|v| v.as_u64().or_else(|| v.as_f64().map(|f| f as u64)))
            .unwrap_or(default)
    }

    #[must_use]
    pub fn bool_option(&self, key: &str, default: bool) -> bool {
        self.option(key).and_then(Value::as_bool).unwrap_or(default)
    }

    #[must_use]
    pub fn strings_option(&self, key: &str) -> Option<Vec<String>> {
        self.option(key).and_then(Value::as_array).map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_owned))
                .collect()
        })
    }

    #[must_use]
    pub fn line(&self, index: usize) -> &str {
        self.source.sanitized_line(index)
    }
}

#[derive(Debug, Clone, Default)]
pub struct Finding {
    pub line: usize,
    pub detail: Option<String>,
    pub context: Option<String>,
    pub range: Option<(usize, usize)>,
}

#[derive(Default)]
pub struct Report {
    pub findings: Vec<Finding>,
}

impl Report {
    pub fn add(&mut self, line: usize) -> &mut Finding {
        self.findings.push(Finding {
            line,
            ..Finding::default()
        });
        self.findings.last_mut().expect("just pushed")
    }

    pub fn expected(&mut self, line: usize, expected: &str, actual: &str) -> Option<&mut Finding> {
        (expected != actual).then(|| {
            let finding = self.add(line);
            finding.detail = Some(format!("Expected: {expected}; Actual: {actual}"));
            finding
        })
    }

    pub fn context(&mut self, line: usize, context: &str, start: bool, end: bool) -> &mut Finding {
        let finding = self.add(line);
        finding.context = Some(ellipsify(context, start, end));
        finding
    }
}

impl Finding {
    pub fn detail(&mut self, detail: impl Into<String>) -> &mut Self {
        self.detail = Some(detail.into());
        self
    }

    pub fn context(&mut self, context: impl Into<String>) -> &mut Self {
        self.context = Some(context.into());
        self
    }

    pub fn range(&mut self, column: usize, length: usize) -> &mut Self {
        self.range = Some((column, length));
        self
    }
}

const ELLIPSIS_LIMIT: usize = 30;

#[must_use]
pub fn ellipsify(text: &str, start: bool, end: bool) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= ELLIPSIS_LIMIT {
        return text.to_owned();
    }
    if start && end {
        let head: String = chars[..15].iter().collect();
        let tail: String = chars[chars.len() - 15..].iter().collect();
        format!("{head}...{tail}")
    } else if end {
        let tail: String = chars[chars.len() - ELLIPSIS_LIMIT..].iter().collect();
        format!("...{tail}")
    } else {
        let head: String = chars[..ELLIPSIS_LIMIT].iter().collect();
        format!("{head}...")
    }
}
