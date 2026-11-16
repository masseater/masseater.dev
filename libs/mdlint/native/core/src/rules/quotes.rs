use std::collections::HashSet;

use super::blocks::code_blocks;
use super::common::{add_range, lines_of};
use super::headings::rule;
use crate::rule::{Context, Report, Rule, RuleMeta};
use crate::tree::Kind;

rule!(
    Md027,
    ["MD027", "no-multiple-space-blockquote"],
    "Multiple spaces after blockquote symbol",
    ["blockquote", "whitespace", "indentation"]
);
rule!(
    Md028,
    ["MD028", "no-blanks-blockquote"],
    "Blank line inside blockquote",
    ["blockquote", "whitespace"]
);

fn verbatim_lines(ctx: &Context<'_>) -> HashSet<usize> {
    let mut set = HashSet::new();
    for block in code_blocks(ctx) {
        if block.content.0 <= block.content.1 {
            add_range(&mut set, block.content.0, block.content.1);
        }
    }
    for (_, node) in ctx.tree.iter() {
        if matches!(node.kind, Kind::HtmlBlock) {
            let (first, last) = lines_of(ctx.source, node);
            if first < last {
                add_range(&mut set, first + 1, last);
            }
        }
    }
    for &(start, end) in &ctx.tree.math_blocks {
        let first = ctx.source.line_of(start);
        let last = ctx.source.line_of(end.saturating_sub(1).max(start));
        if first < last {
            add_range(&mut set, first + 1, last);
        }
    }
    set
}

impl Rule for Md027 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let include_lists = ctx.bool_option("list_items", true);
        let verbatim = verbatim_lines(ctx);
        let list_lines = if include_lists {
            HashSet::new()
        } else {
            let mut set = HashSet::new();
            for (_, node) in ctx.tree.iter() {
                if matches!(node.kind, Kind::List { .. }) {
                    let (first, last) = lines_of(ctx.source, node);
                    add_range(&mut set, first, last);
                }
            }
            set
        };
        let bytes = ctx.source.text.as_bytes();
        let mut items: std::collections::HashMap<u32, Vec<(usize, usize)>> =
            std::collections::HashMap::new();
        for (id, node) in ctx.tree.iter() {
            if !matches!(node.kind, Kind::ListItem) {
                continue;
            }
            if let Some((quote, _)) = ctx
                .tree
                .ancestors(id)
                .find(|(_, n)| matches!(n.kind, Kind::BlockQuote | Kind::ListItem))
                && matches!(ctx.tree.node(quote).kind, Kind::BlockQuote)
            {
                let trimmed = ctx.source.text[node.start..node.end].trim_end();
                let last = ctx
                    .source
                    .line_of(node.start + trimmed.len().saturating_sub(1));
                items
                    .entry(quote)
                    .or_default()
                    .push((ctx.source.line_of(node.start), last));
            }
        }
        for (quote, node) in ctx.tree.iter() {
            if !matches!(node.kind, Kind::BlockQuote) {
                continue;
            }
            let quote_items = items.get(&quote).map_or(&[][..], Vec::as_slice);
            let (first, last) = lines_of(ctx.source, node);
            let indent = node.start - ctx.source.line_range(first).0;
            for line in first..=last {
                if verbatim.contains(&line)
                    || list_lines.contains(&line)
                    || quote_items.iter().any(|&(f, l)| line > f && line <= l)
                {
                    continue;
                }
                let (line_start, line_end) = ctx.source.line_range(line);
                let mut at = line_start + indent.min(line_end - line_start);
                let mut skipped = 0;
                while at < line_end
                    && bytes[at] != b'>'
                    && matches!(bytes[at], b' ' | b'\t')
                    && skipped < 3
                {
                    at += 1;
                    skipped += 1;
                }
                if at >= line_end || bytes[at] != b'>' {
                    continue;
                }
                at += 1;
                if at < line_end && matches!(bytes[at], b' ' | b'\t') {
                    at += 1;
                }
                let ws_start = at;
                while at < line_end && matches!(bytes[at], b' ' | b'\t') {
                    at += 1;
                }
                if at == ws_start {
                    continue;
                }
                if !include_lists && at < line_end && is_list_marker(&ctx.source.text[at..line_end])
                {
                    continue;
                }
                report
                    .context(line, ctx.source.line(line), false, false)
                    .range(ctx.source.column_of(ws_start), at - ws_start);
            }
        }
    }
}

fn is_list_marker(text: &str) -> bool {
    let digits = text.len() - text.trim_start_matches(|c: char| c.is_ascii_digit()).len();
    let rest = &text[digits..];
    let marker = if digits > 0 {
        rest.starts_with(['.', ')'])
    } else {
        rest.starts_with(['-', '+', '*'])
    };
    marker && rest[1..].chars().next().is_none_or(char::is_whitespace)
}

impl Rule for Md028 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for (_, node) in ctx.tree.iter() {
            for pair in node.children.windows(2) {
                let (a, b) = (ctx.tree.node(pair[0]), ctx.tree.node(pair[1]));
                if !matches!(a.kind, Kind::BlockQuote) || !matches!(b.kind, Kind::BlockQuote) {
                    continue;
                }
                let trimmed = ctx.source.text[a.start..a.end].trim_end();
                let after = ctx
                    .source
                    .line_of(a.start + trimmed.len().saturating_sub(1))
                    + 1;
                let next = ctx.source.line_of(b.start);
                for line in after..next {
                    if ctx.source.line(line).trim().is_empty() {
                        report.add(line);
                    }
                }
            }
        }
    }
}
