use super::blocks::code_blocks;
use super::common::inline_math_spans;
use super::common::lines_of;
use super::headings::rule;
use super::inline::{bare_urls, html_text_runs};
use crate::features::check_markdown::rule::{Context, Report, Rule, RuleMeta};
use crate::shared::source::utf16_len;
use crate::shared::tree::{Kind, LinkKind};

rule!(
    Md044,
    ["MD044", "proper-names"],
    "Proper names should have the correct capitalization",
    ["spelling"]
);

fn push_lines(
    ctx: &Context<'_>,
    segments: &mut Vec<(usize, usize, bool)>,
    start: usize,
    end: usize,
) {
    let mut at = start;
    for piece in ctx.source.text[start..end].split('\n') {
        if !piece.is_empty() {
            segments.push((at, at + piece.len(), !piece.trim_start().starts_with('<')));
        }
        at += piece.len() + 1;
    }
}

fn segments(ctx: &Context<'_>, code: bool, html: bool) -> Vec<(usize, usize, bool)> {
    let mut segments = Vec::new();
    for (id, node) in ctx.tree.iter() {
        match node.kind {
            Kind::Text => {
                let in_autolink = ctx.tree.ancestors(id).any(|(_, n)| {
                    matches!(
                        n.kind,
                        Kind::Link {
                            link: LinkKind::Autolink | LinkKind::Email,
                            ..
                        }
                    )
                });
                if !in_autolink
                    && !ctx.tree.inside(id, |k| {
                        matches!(k, Kind::CodeBlock { .. } | Kind::HtmlBlock)
                    })
                {
                    push_lines(ctx, &mut segments, node.start, node.end);
                }
            }
            Kind::Code if code => {
                let full = &ctx.source.text[node.start..node.end];
                let ticks = full.len() - full.trim_start_matches('`').len();
                if full.len() >= ticks * 2 {
                    push_lines(ctx, &mut segments, node.start + ticks, node.end - ticks);
                }
            }
            Kind::InlineHtml if html => push_lines(ctx, &mut segments, node.start, node.end),
            Kind::HtmlBlock if !html => {
                for (start, end) in html_text_runs(&ctx.source.text[node.start..node.end]) {
                    push_lines(ctx, &mut segments, node.start + start, node.start + end);
                }
            }
            Kind::HtmlBlock => {
                let (first, last) = lines_of(ctx.source, node);
                for line in first..=last {
                    let (line_start, line_end) = ctx.source.line_range(line);
                    let start = line_start.max(node.start);
                    let end = line_end.min(node.end);
                    if start < end {
                        segments.push((
                            start,
                            end,
                            !ctx.source.text[start..end].trim_start().starts_with('<'),
                        ));
                    }
                }
            }
            _ => {}
        }
    }
    if code {
        for block in code_blocks(ctx) {
            if block.content.0 > block.content.1 {
                continue;
            }
            for line in block.content.0..=block.content.1 {
                let (line_start, line_end) = ctx.source.line_range(line);
                let start = line_start.max(block.node.start);
                if start < line_end {
                    segments.push((start, line_end, true));
                }
            }
        }
    }
    segments
}

impl Rule for Md044 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut names = ctx.strings_option("names").unwrap_or_default();
        if names.is_empty() {
            return;
        }
        names.sort_by(|a, b| {
            b.chars()
                .count()
                .cmp(&a.chars().count())
                .then_with(|| locale_compare(a, b))
        });
        let code = ctx.bool_option("code_blocks", true);
        let html = ctx.bool_option("html_elements", true);
        let segments = segments(ctx, code, html);
        let urls: Vec<(usize, usize)> = segments
            .iter()
            .filter(|s| s.2)
            .flat_map(|&(start, end, _)| {
                bare_urls(&ctx.source.text[start..end])
                    .into_iter()
                    .map(move |(s, e)| (start + s, start + e))
            })
            .collect();
        let mut exclusions: Vec<(usize, usize)> = inline_math_spans(ctx)
            .iter()
            .copied()
            .filter(|&(s, _)| ctx.source.text.as_bytes()[s] == b'$')
            .collect();
        for name in &names {
            let starts_word = name
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_alphanumeric() || c == '_');
            let ends_word = name
                .chars()
                .next_back()
                .is_some_and(|c| c.is_ascii_alphanumeric() || c == '_');
            let pattern = format!(
                "(?i)({}){}{}",
                if starts_word { r"(?-u:\b)_*" } else { "" },
                format_args!("({})", regex::escape(name)),
                if ends_word { r"_*(?-u:\b)" } else { "" }
            );
            let Some(re) = super::common::cached_regex(&pattern) else {
                continue;
            };
            for &(start, end, _) in &segments {
                let text = &ctx.source.text[start..end];
                for caps in re.captures_iter(text) {
                    let Some(found) = caps.get(2) else { continue };
                    let range = (start + found.start(), start + found.end());
                    let overlaps = |&(s, e): &(usize, usize)| range.0 < e && s < range.1;
                    if !names.iter().any(|n| n == found.as_str())
                        && !exclusions.iter().any(overlaps)
                        && !urls.iter().any(overlaps)
                    {
                        report
                            .add(ctx.source.line_of(range.0))
                            .detail(format!("Expected: {name}; Actual: {}", found.as_str()))
                            .range(ctx.source.column_of(range.0), utf16_len(found.as_str()));
                    }
                    exclusions.push(range);
                }
            }
        }
    }
}

fn locale_compare(a: &str, b: &str) -> std::cmp::Ordering {
    a.to_lowercase().cmp(&b.to_lowercase()).then_with(|| {
        a.chars().zip(b.chars()).find(|(x, y)| x != y).map_or(
            std::cmp::Ordering::Equal,
            |(x, _)| {
                if x.is_lowercase() {
                    std::cmp::Ordering::Less
                } else {
                    std::cmp::Ordering::Greater
                }
            },
        )
    })
}
