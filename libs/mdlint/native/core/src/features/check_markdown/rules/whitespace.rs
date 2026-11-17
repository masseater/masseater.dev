use std::collections::HashSet;
use std::sync::LazyLock;

use regex::Regex;

use super::common::{
    add_range, block_lines, definition_lines, ignored_block_lines, inline_math_spans,
    is_blank_line, is_code_block, lines_of,
};
use super::headings::rule;
use super::inline::bare_urls;
use crate::features::check_markdown::rule::{Context, Report, Rule, RuleMeta};
use crate::shared::source::utf16_len;
use crate::shared::tree::Kind;

rule!(
    Md009,
    ["MD009", "no-trailing-spaces"],
    "Trailing spaces",
    ["whitespace"]
);
rule!(
    Md010,
    ["MD010", "no-hard-tabs"],
    "Hard tabs",
    ["whitespace", "hard_tab"]
);
rule!(
    Md011,
    ["MD011", "no-reversed-links"],
    "Reversed link syntax",
    ["links"]
);
rule!(
    Md012,
    ["MD012", "no-multiple-blanks"],
    "Multiple consecutive blank lines",
    ["whitespace", "blank_lines"]
);
rule!(
    Md013,
    ["MD013", "line-length"],
    "Line length",
    ["line_length"]
);
rule!(
    Md047,
    ["MD047", "single-trailing-newline"],
    "Files should end with a single newline character",
    ["blank_lines"]
);

fn fenced_inner_and_indented(ctx: &Context<'_>) -> HashSet<usize> {
    let mut set = HashSet::new();
    for (_, node) in ctx.tree.iter() {
        match node.kind {
            Kind::CodeBlock { fenced: true, .. } => {
                let (first, last) = lines_of(ctx.source, node);
                let closed = fence_closed(ctx, node.start, last);
                let end = if closed { last.saturating_sub(1) } else { last };
                if first < end {
                    add_range(&mut set, first + 1, end);
                }
            }
            Kind::CodeBlock { fenced: false, .. } => {
                let (first, mut last) = code_indented_lines(ctx, node.start, node.end);
                while last + 1 < ctx.source.line_count() {
                    let next = ctx.source.line(last + 1);
                    if !next.trim().is_empty()
                        || !(next.starts_with("    ") || next.starts_with('\t'))
                    {
                        break;
                    }
                    last += 1;
                }
                add_range(&mut set, first, last);
            }
            _ => {}
        }
    }
    set
}

#[must_use]
pub fn code_indented_lines(ctx: &Context<'_>, start: usize, end: usize) -> (usize, usize) {
    let first = ctx.source.line_of(start);
    let mut last = ctx.source.line_of(end.saturating_sub(1).max(start));
    while last > first && ctx.source.line(last).trim().is_empty() {
        last -= 1;
    }
    (first, last)
}

#[must_use]
pub fn fence_closed(ctx: &Context<'_>, start: usize, last: usize) -> bool {
    let open_line = ctx.source.line_of(start);
    if last == open_line {
        return false;
    }
    let opener = ctx.source.text[start..].trim_start();
    let fence_char = opener.chars().next().unwrap_or('`');
    let fence_len = opener.len() - opener.trim_start_matches(fence_char).len();
    let closing = ctx.source.line(last);
    let trimmed = closing.trim_start_matches([' ', '>', '\t']).trim_end();
    trimmed.len() >= fence_len && trimmed.chars().all(|c| c == fence_char)
}

impl Rule for Md009 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let br_spaces = ctx.uint_option("br_spaces", 2) as usize;
        let include_code = ctx.bool_option("code_blocks", false);
        let list_empty = ctx.bool_option("list_item_empty_lines", false);
        let strict = ctx.bool_option("strict", false);
        let code = if include_code {
            HashSet::new()
        } else {
            fenced_inner_and_indented(ctx)
        };
        let mut list_lines = HashSet::new();
        if list_empty {
            for (_, node) in ctx.tree.iter() {
                if !matches!(node.kind, Kind::List { .. }) {
                    continue;
                }
                let (first, last) = lines_of(ctx.source, node);
                add_range(&mut list_lines, first, last);
                for &item in &node.children {
                    let (item_first, item_last) = lines_of(ctx.source, ctx.tree.node(item));
                    let mut index = item_last;
                    while index > item_first && ctx.line(index).trim().is_empty() {
                        list_lines.remove(&index);
                        index -= 1;
                    }
                }
            }
        }
        let mut paragraph_lines = HashSet::new();
        let mut code_span_lines = HashSet::new();
        if strict {
            for (_, node) in ctx.tree.iter() {
                match node.kind {
                    Kind::Paragraph => {
                        let (first, last) = lines_of(ctx.source, node);
                        if last > first {
                            add_range(&mut paragraph_lines, first, last - 1);
                        }
                    }
                    Kind::Code => {
                        let (first, last) = lines_of(ctx.source, node);
                        if last > first {
                            add_range(&mut code_span_lines, first, last - 1);
                        }
                    }
                    _ => {}
                }
            }
        }
        let expected = if br_spaces < 2 { 0 } else { br_spaces };
        for index in ctx.source.body_lines() {
            let line = ctx.line(index);
            let trailing = utf16_len(line) - utf16_len(line.trim_end());
            if trailing > 0
                && !code.contains(&index)
                && !list_lines.contains(&index)
                && (expected != trailing
                    || strict
                        && (!paragraph_lines.contains(&index) || code_span_lines.contains(&index)))
            {
                let column = utf16_len(line) - trailing + 1;
                let detail = if expected == 0 {
                    format!("Expected: {expected}; Actual: {trailing}")
                } else {
                    format!("Expected: 0 or {expected}; Actual: {trailing}")
                };
                report.add(index).detail(detail).range(column, trailing);
            }
        }
    }
}

impl Rule for Md010 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let include_code = ctx
            .option("code_blocks")
            .is_none_or(|v| v.as_bool().unwrap_or(true));
        let ignore_languages: HashSet<String> = ctx
            .strings_option("ignore_code_languages")
            .unwrap_or_default()
            .into_iter()
            .map(|l| l.to_lowercase())
            .collect();
        let mut excluded: Vec<(usize, usize, usize, usize)> = Vec::new();
        for (_, node) in ctx.tree.iter() {
            match &node.kind {
                Kind::CodeBlock { fenced: true, info } => {
                    let language = info.split_whitespace().next().unwrap_or("").to_lowercase();
                    if !include_code
                        || !ignore_languages.is_empty() && ignore_languages.contains(&language)
                    {
                        let (first, last) = lines_of(ctx.source, node);
                        let closed = fence_closed(ctx, node.start, last);
                        excluded.push((
                            first + 1,
                            0,
                            if closed { last.saturating_sub(1) } else { last },
                            usize::MAX,
                        ));
                    }
                }
                Kind::CodeBlock { fenced: false, .. } if !include_code => {
                    let (first, last) = code_indented_lines(ctx, node.start, node.end);
                    excluded.push((first, 0, last, usize::MAX));
                }
                Kind::Code if !include_code => {
                    excluded.push((
                        ctx.source.line_of(node.start),
                        ctx.source.column_of(node.start),
                        ctx.source.line_of(node.end - 1),
                        ctx.source.column_of(node.end - 1),
                    ));
                }
                _ => {}
            }
        }
        for index in ctx.source.body_lines() {
            let line = ctx.line(index);
            let mut at = 0;
            while let Some(found) = line[at..].find('\t') {
                let start = at + found;
                let length = line[start..].len() - line[start..].trim_start_matches('\t').len();
                let column = utf16_len(&line[..start]) + 1;
                let end_column = column + length - 1;
                let overlaps = excluded.iter().any(|&(sl, sc, el, ec)| {
                    let after_start = index > sl || index == sl && end_column >= sc;
                    let before_end = index < el || index == el && column <= ec;
                    after_start && before_end
                });
                if !overlaps {
                    report
                        .add(index)
                        .detail(format!("Column: {column}"))
                        .range(column, length);
                }
                at = start + length;
            }
        }
    }
}

static REVERSED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(^|[^\\])\(([^()]+)\)\[([^\]^][^\]]*)\]").expect("md011"));

impl Rule for Md011 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ignored = ignored_block_lines(ctx);
        let spans = inline_math_spans(ctx);
        for index in ctx.source.body_lines() {
            if ignored.contains(&index) {
                continue;
            }
            let line = ctx.line(index);
            let line_start = ctx.source.line_range(index).0;
            let mut at = 0;
            while let Some(caps) = REVERSED.captures_at(line, at) {
                let whole = caps.get(0).expect("match");
                at = whole.end().max(whole.start() + 1);
                let pre = caps[1].len();
                if line[whole.end()..].starts_with('(')
                    || caps[2].ends_with('\\')
                    || caps[3].ends_with('\\')
                {
                    continue;
                }
                let start = line_start + whole.start() + pre;
                let end = line_start + whole.end();
                if spans.iter().any(|&(s, e)| s < end && start < e) {
                    continue;
                }
                let column = utf16_len(&line[..whole.start() + pre]) + 1;
                let text = &whole.as_str()[pre..];
                report
                    .add(index)
                    .detail(text)
                    .range(column, utf16_len(text));
            }
        }
    }
}

impl Rule for Md012 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let maximum = ctx.uint_option("maximum", 1);
        let code = block_lines(ctx, is_code_block);
        let mut count = 0u64;
        for index in ctx.source.body_lines() {
            let line = ctx.line(index);
            count = if code.contains(&index) || !line.trim().is_empty() {
                0
            } else {
                count + 1
            };
            if maximum < count {
                report.expected(index, &maximum.to_string(), &count.to_string());
            }
        }
    }
}

static NOT_WRAPPABLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(?:[#>\s]*\s)?\S*$").expect("md013"));
static LAST_RUN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[^\t\n\x0C\r ]*$").expect("md013"));

fn link_and_data_lines(
    ctx: &Context<'_>,
    touches_long: impl Fn(usize, usize) -> bool,
) -> (HashSet<usize>, HashSet<usize>) {
    let mut link_lines = block_lines(ctx, |k| matches!(k, Kind::Link { .. } | Kind::Image { .. }));
    let mut data_lines = HashSet::new();
    for (id, node) in ctx.tree.iter() {
        if !matches!(node.kind, Kind::Text)
            || !touches_long(node.start, node.end)
            || ctx.tree.inside(id, |k| {
                matches!(
                    k,
                    Kind::Link { .. }
                        | Kind::Image { .. }
                        | Kind::CodeBlock { .. }
                        | Kind::HtmlBlock
                )
            })
        {
            continue;
        }
        let text = &ctx.source.text[node.start..node.end];
        let urls = bare_urls(text);
        for &(s, e) in &urls {
            add_range(
                &mut link_lines,
                ctx.source.line_of(node.start + s),
                ctx.source.line_of(node.start + e - 1),
            );
        }
        let paragraph = node
            .parent
            .is_some_and(|p| matches!(ctx.tree.node(p).kind, Kind::Paragraph | Kind::ListItem));
        if !paragraph {
            continue;
        }
        let mut at = 0;
        for &(s, e) in urls
            .iter()
            .chain(std::iter::once(&(text.len(), text.len())))
        {
            if s > at {
                add_range(
                    &mut data_lines,
                    ctx.source.line_of(node.start + at),
                    ctx.source.line_of(node.start + s - 1),
                );
            }
            at = e;
        }
    }
    (link_lines, data_lines)
}

impl Rule for Md013 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let line_length = ctx.uint_option("line_length", 80) as usize;
        let heading_length = ctx.uint_option("heading_line_length", line_length as u64) as usize;
        let code_length = ctx.uint_option("code_block_line_length", line_length as u64) as usize;
        let strict = ctx.bool_option("strict", false);
        let stern = ctx.bool_option("stern", false);
        let include_code = ctx.bool_option("code_blocks", true);
        let include_tables = ctx.bool_option("tables", true);
        let include_headings = ctx.bool_option("headings", true);
        let shortest = [line_length, heading_length, code_length]
            .into_iter()
            .filter(|&m| m > 0)
            .min()
            .unwrap_or(0);
        let long: Vec<bool> = (0..ctx.source.line_count())
            .map(|index| shortest > 0 && ctx.line(index).len() >= shortest)
            .collect();
        if !ctx.source.body_lines().any(|index| long[index]) {
            return;
        }
        let touches_long = |start: usize, end: usize| {
            (ctx.source.line_of(start)..=ctx.source.line_of(end.saturating_sub(1).max(start)))
                .any(|line| long[line])
        };
        let heading_lines = block_lines(ctx, |k| matches!(k, Kind::Heading { .. }));
        let code_lines = block_lines(ctx, is_code_block);
        let table_lines = block_lines(ctx, |k| matches!(k, Kind::Table));
        let (link_lines, data_lines) = link_and_data_lines(ctx, touches_long);
        let mut definition_lines = definition_lines(ctx).clone();
        definition_lines.extend(block_lines(ctx, |k| {
            matches!(k, Kind::FootnoteDefinition { .. })
        }));
        for index in ctx.source.body_lines() {
            if !long[index] {
                continue;
            }
            let line = ctx.line(index);
            let is_heading = heading_lines.contains(&index);
            let in_code = code_lines.contains(&index);
            let in_table = table_lines.contains(&index);
            let link_only = link_lines.contains(&index) && !data_lines.contains(&index);
            let max = if in_code {
                code_length
            } else if is_heading {
                heading_length
            } else {
                line_length
            };
            let text_len = if strict || stern {
                utf16_len(line)
            } else {
                utf16_len(&LAST_RUN.replace(line, "#"))
            };
            let length = utf16_len(line);
            if max > 0
                && (include_code || !in_code)
                && (include_tables || !in_table)
                && (include_headings || !is_heading)
                && !definition_lines.contains(&index)
                && (strict || ((!stern || !NOT_WRAPPABLE.is_match(line)) && !link_only))
                && text_len > max
            {
                report
                    .expected(index, &max.to_string(), &length.to_string())
                    .map(|f| f.range(max + 1, length - max));
            }
        }
    }
}

impl Rule for Md047 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let last = ctx.source.line_count() - 1;
        let line = ctx.line(last);
        if !is_blank_line(line) {
            report.add(last).range(utf16_len(line), 1);
        }
    }
}
