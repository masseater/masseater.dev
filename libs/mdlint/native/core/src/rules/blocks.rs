use std::sync::LazyLock;

use regex::Regex;

use super::common::{is_blank_line, lines_of};
use super::headings::{content_start, rule};
use super::whitespace::{code_indented_lines, fence_closed};
use crate::rule::{Context, Report, Rule, RuleMeta};
use crate::source::utf16_len;
use crate::tree::{Kind, Node};

rule!(
    Md014,
    ["MD014", "commands-show-output"],
    "Dollar signs used before commands without showing output",
    ["code"]
);
rule!(
    Md031,
    ["MD031", "blanks-around-fences"],
    "Fenced code blocks should be surrounded by blank lines",
    ["code", "blank_lines"]
);
rule!(
    Md040,
    ["MD040", "fenced-code-language"],
    "Fenced code blocks should have a language specified",
    ["code", "language"]
);
rule!(
    Md046,
    ["MD046", "code-block-style"],
    "Code block style",
    ["code"]
);
rule!(
    Md048,
    ["MD048", "code-fence-style"],
    "Code fence style",
    ["code"]
);

pub struct CodeBlock<'a> {
    pub id: u32,
    pub node: &'a Node,
    pub fenced: bool,
    pub first: usize,
    pub last: usize,
    pub closed: bool,
    pub content: (usize, usize),
}

#[must_use]
pub fn code_blocks<'c>(ctx: &Context<'c>) -> &'c [CodeBlock<'c>] {
    ctx.cache
        .code_blocks
        .get_or_init(|| compute_code_blocks(ctx))
}

fn compute_code_blocks<'a>(ctx: &Context<'a>) -> Vec<CodeBlock<'a>> {
    ctx.tree
        .iter()
        .filter_map(|(id, node)| match node.kind {
            Kind::CodeBlock { fenced: true, .. } => {
                let (first, last) = lines_of(ctx.source, node);
                let closed = fence_closed(ctx, node.start, last);
                let content_last = if closed { last.saturating_sub(1) } else { last };
                Some(CodeBlock {
                    id,
                    node,
                    fenced: true,
                    first,
                    last,
                    closed,
                    content: (first + 1, content_last),
                })
            }
            Kind::CodeBlock { fenced: false, .. } => {
                let (first, last) = code_indented_lines(ctx, node.start, node.end);
                Some(CodeBlock {
                    id,
                    node,
                    fenced: false,
                    first,
                    last,
                    closed: true,
                    content: (first, last),
                })
            }
            _ => None,
        })
        .collect()
}

#[must_use]
pub fn fence_text<'a>(ctx: &'a Context<'_>, block: &CodeBlock<'_>) -> &'a str {
    let (_, end) = ctx.source.line_range(block.first);
    let start = ctx.source.text[block.node.start..end]
        .find(['`', '~'])
        .map_or(block.node.start, |p| block.node.start + p);
    &ctx.source.text[start..end]
}

static DOLLAR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(\s*)(\$\s+)").expect("md014"));

impl Rule for Md014 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for block in code_blocks(ctx) {
            if block.content.0 > block.content.1 {
                continue;
            }
            let fence_indent = if block.fenced {
                block.node.start - content_start(ctx, block.id, block.first).min(block.node.start)
            } else {
                4
            };
            let mut values = Vec::new();
            for line in block.content.0..=block.content.1 {
                let (line_start, line_end) = ctx.source.line_range(line);
                let container = content_start(ctx, block.id, line)
                    .max(line_start)
                    .min(line_end);
                let rest = &ctx.source.text[container..line_end];
                let strip = rest.len() - rest.trim_start_matches(' ').len();
                let value_start = container + strip.min(fence_indent);
                let value = &ctx.source.text[value_start..line_end];
                if value.is_empty() {
                    continue;
                }
                values.push((
                    line,
                    value,
                    utf16_len(&ctx.source.text[line_start..value_start]) + 1,
                ));
            }
            let matched: Vec<_> = values
                .iter()
                .filter_map(|(line, value, column)| {
                    DOLLAR
                        .captures(value)
                        .map(|c| (*line, *value, *column, c[1].len(), c[2].len()))
                })
                .collect();
            if !values.is_empty() && matched.len() == values.len() {
                for (line, value, column, lead, length) in matched {
                    report
                        .context(line, value, false, false)
                        .range(column + lead, length);
                }
            }
        }
    }
}

impl Rule for Md031 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let include_lists = ctx.bool_option("list_items", true);
        let body = ctx.source.body_line;
        let blank = |index: i64| -> bool {
            index < body as i64
                || index as usize >= ctx.source.line_count()
                || is_blank_line(ctx.line(index as usize))
        };
        for block in code_blocks(ctx).iter().filter(|b| b.fenced) {
            if !include_lists
                && ctx
                    .tree
                    .inside(block.id, |k| matches!(k, Kind::List { .. }))
            {
                continue;
            }
            if !blank(block.first as i64 - 1) {
                report.context(block.first, ctx.line(block.first).trim(), false, false);
            }
            if !blank(block.last as i64 + 1) && !blank(block.last as i64) {
                report.context(block.last, ctx.line(block.last).trim(), false, false);
            }
        }
    }
}

impl Rule for Md040 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let allowed = ctx.strings_option("allowed_languages").unwrap_or_default();
        let language_only = ctx.bool_option("language_only", false);
        for block in code_blocks(ctx).iter().filter(|b| b.fenced) {
            let text = fence_text(ctx, block);
            let fence_char = text.chars().next().unwrap_or('`');
            let info_text = text.trim_start_matches(fence_char).trim();
            let mut words = info_text.splitn(2, [' ', '\t']);
            let info = words.next().unwrap_or("");
            let meta = words.next().map_or("", str::trim);
            if info.is_empty() {
                report.context(block.first, text, false, false);
            } else if !allowed.is_empty() && !allowed.iter().any(|a| a == info) {
                report
                    .add(block.first)
                    .detail(format!("\"{info}\" is not allowed"));
            }
            if language_only && !meta.is_empty() {
                report.add(block.first).detail(format!(
                    "Info string contains more than language: \"{text}\""
                ));
            }
        }
    }
}

impl Rule for Md046 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut expected = ctx.str_option("style", "consistent").to_owned();
        for block in code_blocks(ctx) {
            let style = if block.fenced { "fenced" } else { "indented" };
            if expected == "consistent" {
                style.clone_into(&mut expected);
            }
            report.expected(block.first, &expected, style);
        }
    }
}

impl Rule for Md048 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut expected = ctx.str_option("style", "consistent").to_owned();
        for block in code_blocks(ctx).iter().filter(|b| b.fenced) {
            let style = if fence_text(ctx, block).starts_with('~') {
                "tilde"
            } else {
                "backtick"
            };
            if expected == "consistent" {
                style.clone_into(&mut expected);
            }
            report.expected(block.first, &expected, style);
        }
    }
}
