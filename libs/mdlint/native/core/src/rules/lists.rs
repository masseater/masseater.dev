use super::common::is_blank_line;
use super::headings::rule;
use crate::rule::{Context, Report, Rule, RuleMeta};
use crate::tree::Kind;

rule!(
    Md004,
    ["MD004", "ul-style"],
    "Unordered list style",
    ["bullet", "ul"]
);
rule!(
    Md005,
    ["MD005", "list-indent"],
    "Inconsistent indentation for list items at the same level",
    ["bullet", "ul", "indentation"]
);
rule!(
    Md007,
    ["MD007", "ul-indent"],
    "Unordered list indentation",
    ["bullet", "ul", "indentation"]
);
rule!(
    Md029,
    ["MD029", "ol-prefix"],
    "Ordered list item prefix",
    ["ol"]
);
rule!(
    Md030,
    ["MD030", "list-marker-space"],
    "Spaces after list markers",
    ["ol", "ul", "whitespace"]
);
rule!(
    Md032,
    ["MD032", "blanks-around-lists"],
    "Lists should be surrounded by blank lines",
    ["bullet", "ul", "ol", "blank_lines"]
);

pub struct Item {
    pub line: usize,
    pub marker: usize,
    pub value: (usize, usize),
    pub whitespace: Option<(usize, usize)>,
    pub prefix_end: usize,
}

pub struct List {
    pub id: u32,
    pub ordered: bool,
    pub first: usize,
    pub last: usize,
    pub items: Vec<Item>,
}

fn item(ctx: &Context<'_>, start: usize) -> Item {
    let bytes = ctx.source.text.as_bytes();
    let mut marker = start;
    while matches!(bytes.get(marker), Some(b' ' | b'\t' | b'\n')) {
        marker += 1;
    }
    let mut value_end = marker;
    while bytes.get(value_end).is_some_and(u8::is_ascii_digit) {
        value_end += 1;
    }
    let marker_end = value_end + 1;
    let line = ctx.source.line_of(marker);
    let line_end = ctx.source.line_range(line).1;
    let mut space_end = marker_end;
    while space_end < line_end && matches!(bytes[space_end], b' ' | b'\t') {
        space_end += 1;
    }
    let whitespace = if space_end == marker_end || space_end == line_end {
        None
    } else if space_end - marker_end > 4 {
        Some((marker_end, marker_end + 1))
    } else {
        Some((marker_end, space_end))
    };
    Item {
        line,
        marker,
        value: (marker, value_end),
        whitespace,
        prefix_end: whitespace.map_or(marker_end, |w| w.1),
    }
}

fn last_content_line(ctx: &Context<'_>, first: usize, last: usize) -> usize {
    let mut last = last;
    while last > first && is_blank_line(ctx.line(last)) {
        last -= 1;
    }
    last
}

#[must_use]
pub fn lists<'c>(ctx: &Context<'c>) -> &'c [List] {
    ctx.cache.lists.get_or_init(|| compute_lists(ctx))
}

fn compute_lists(ctx: &Context<'_>) -> Vec<List> {
    ctx.tree
        .iter()
        .filter_map(|(id, node)| {
            let Kind::List { ordered, .. } = node.kind else {
                return None;
            };
            let items: Vec<Item> = node
                .children
                .iter()
                .map(|&child| item(ctx, ctx.tree.node(child).start))
                .collect();
            let first = items
                .first()
                .map_or_else(|| ctx.source.line_of(node.start), |i| i.line);
            let last = ctx
                .tree
                .descendants(id)
                .filter(|(_, n)| {
                    !matches!(
                        n.kind,
                        Kind::List { .. }
                            | Kind::ListItem
                            | Kind::BlockQuote
                            | Kind::FootnoteDefinition { .. }
                    )
                })
                .map(|(_, n)| {
                    let trimmed = ctx.source.text[n.start..n.end].trim_end();
                    ctx.source
                        .line_of(n.start + trimmed.len().saturating_sub(1))
                })
                .chain(items.iter().map(|i| i.line))
                .chain(
                    ctx.tree
                        .math_blocks
                        .iter()
                        .filter(|&&(s, _)| s >= node.start && s < node.end)
                        .map(|&(s, e)| ctx.source.line_of(e.saturating_sub(1).max(s))),
                )
                .max()
                .unwrap_or(first);
            Some(List {
                id,
                ordered,
                first,
                last: last_content_line(ctx, first, last),
                items,
            })
        })
        .collect()
}

fn column(ctx: &Context<'_>, offset: usize) -> usize {
    ctx.source.column_of(offset)
}

fn style_of(marker: u8) -> &'static str {
    match marker {
        b'-' => "dash",
        b'+' => "plus",
        _ => "asterisk",
    }
}

fn different_style(style: &str) -> &'static str {
    match style {
        "dash" => "plus",
        "plus" => "asterisk",
        _ => "dash",
    }
}

impl Rule for Md004 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx.str_option("style", "consistent");
        let style = if style.is_empty() {
            "consistent"
        } else {
            style
        };
        let mut expected = if ["asterisk", "consistent", "dash", "plus", "sublist"].contains(&style)
        {
            style.to_owned()
        } else {
            "dash".to_owned()
        };
        let mut nesting_styles: Vec<Option<&'static str>> = Vec::new();
        for list in lists(ctx).iter().filter(|l| !l.ordered) {
            let nesting = ctx
                .tree
                .ancestors(list.id)
                .filter(|(_, n)| matches!(n.kind, Kind::List { .. }))
                .count();
            for item in &list.items {
                let actual = style_of(ctx.source.text.as_bytes()[item.marker]);
                if style == "sublist" {
                    if nesting_styles.len() <= nesting {
                        nesting_styles.resize(nesting + 1, None);
                    }
                    if nesting_styles[nesting].is_none() {
                        let previous = nesting.checked_sub(1).and_then(|n| nesting_styles[n]);
                        nesting_styles[nesting] = Some(if previous == Some(actual) {
                            different_style(actual)
                        } else {
                            actual
                        });
                    }
                    nesting_styles[nesting]
                        .unwrap_or(actual)
                        .clone_into(&mut expected);
                } else if expected == "consistent" {
                    actual.clone_into(&mut expected);
                }
                if let Some(finding) = report.expected(item.line, &expected, actual) {
                    finding.range(column(ctx, item.marker), 1);
                }
            }
        }
    }
}

impl Rule for Md005 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for list in lists(ctx) {
            let Some(first) = list.items.first() else {
                continue;
            };
            let expected_indent = column(ctx, first.marker) - 1;
            let mut expected_end = 0;
            let mut end_matching = false;
            for item in &list.items {
                let actual_indent = column(ctx, item.marker) - 1;
                let range = (1, column(ctx, item.prefix_end) - 1);
                if !list.ordered {
                    if let Some(finding) = report.expected(
                        item.line,
                        &expected_indent.to_string(),
                        &actual_indent.to_string(),
                    ) {
                        finding.range(range.0, range.1);
                    }
                    continue;
                }
                let marker_length = item.value.1 - item.value.0 + 1;
                let actual_end = column(ctx, item.marker) + marker_length - 1;
                if expected_end == 0 {
                    expected_end = actual_end;
                }
                if expected_indent != actual_indent || end_matching {
                    if expected_end == actual_end {
                        end_matching = true;
                    } else {
                        let detail = if end_matching {
                            format!("Expected: ({expected_end}); Actual: ({actual_end})")
                        } else {
                            format!("Expected: {expected_indent}; Actual: {actual_indent}")
                        };
                        report.add(item.line).detail(detail).range(range.0, range.1);
                    }
                }
            }
        }
    }
}

fn block_quote_adjustment(ctx: &Context<'_>, line: usize) -> usize {
    let text = ctx.source.line(line).as_bytes();
    let mut index = 0;
    let mut end = 0;
    loop {
        while matches!(text.get(index), Some(b' ' | b'\t')) {
            index += 1;
        }
        if text.get(index) != Some(&b'>') {
            break;
        }
        index += 1;
        if matches!(text.get(index), Some(b' ' | b'\t')) {
            index += 1;
        }
        end = index;
    }
    end
}

impl Rule for Md007 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let indent = usize::try_from(ctx.uint_option("indent", 2)).unwrap_or(2);
        let start_indented = ctx.bool_option("start_indented", false);
        let start_indent =
            usize::try_from(ctx.uint_option("start_indent", indent as u64)).unwrap_or(indent);
        for list in lists(ctx).iter().filter(|l| !l.ordered) {
            let mut nesting = 0;
            let mut skip = false;
            for (_, ancestor) in ctx.tree.ancestors(list.id) {
                match ancestor.kind {
                    Kind::List { ordered: false, .. } => nesting += 1,
                    Kind::List { ordered: true, .. } => {
                        skip = true;
                        break;
                    }
                    Kind::BlockQuote => break,
                    _ => {}
                }
            }
            if skip {
                continue;
            }
            let base = if ctx
                .tree
                .inside(list.id, |k| matches!(k, Kind::FootnoteDefinition { .. }))
            {
                4
            } else {
                0
            };
            let expected = base + if start_indented { start_indent } else { 0 } + nesting * indent;
            for item in &list.items {
                let actual = column(ctx, item.marker) - 1 - block_quote_adjustment(ctx, item.line);
                if let Some(finding) =
                    report.expected(item.line, &expected.to_string(), &actual.to_string())
                {
                    finding.range(1, column(ctx, item.prefix_end) - 1);
                }
            }
        }
    }
}

impl Rule for Md029 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx
            .option("style")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("");
        for list in lists(ctx).iter().filter(|l| l.ordered) {
            let value = |item: &Item| &ctx.source.text[item.value.0..item.value.1];
            let number = |item: &Item| value(item).parse::<u64>().unwrap_or(0);
            let mut expected = 1u64;
            let mut incrementing = false;
            if list.items.len() > 1 {
                let first = number(&list.items[0]);
                if number(&list.items[1]) != 1 || first == 0 {
                    incrementing = true;
                    if first == 0 {
                        expected = 0;
                    }
                }
            }
            let list_style = match style {
                "one" | "ordered" | "zero" => style,
                _ if incrementing => "ordered",
                _ => "one",
            };
            match list_style {
                "zero" => expected = 0,
                "one" => expected = 1,
                _ => {}
            }
            let example = match list_style {
                "one" => "1/1/1",
                "zero" => "0/0/0",
                _ => "1/2/3",
            };
            for item in &list.items {
                let actual = number(item);
                if expected != actual {
                    report
                        .add(item.line)
                        .detail(format!(
                            "Expected: {expected}; Actual: {actual}; Style: {example}"
                        ))
                        .range(
                            column(ctx, item.marker),
                            column(ctx, item.prefix_end) - column(ctx, item.marker),
                        );
                }
                if list_style == "ordered" {
                    expected += 1;
                }
            }
        }
    }
}

impl Rule for Md030 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ul_single = ctx.uint_option("ul_single", 1);
        let ol_single = ctx.uint_option("ol_single", 1);
        let ul_multi = ctx.uint_option("ul_multi", 1);
        let ol_multi = ctx.uint_option("ol_multi", 1);
        for list in lists(ctx) {
            let single = list.last - list.first + 1 == list.items.len();
            let expected = match (list.ordered, single) {
                (true, true) => ol_single,
                (true, false) => ol_multi,
                (false, true) => ul_single,
                (false, false) => ul_multi,
            };
            for item in &list.items {
                let Some((start, end)) = item.whitespace else {
                    continue;
                };
                let actual = (end - start) as u64;
                if let Some(finding) =
                    report.expected(item.line, &expected.to_string(), &actual.to_string())
                {
                    finding.range(
                        column(ctx, item.marker),
                        column(ctx, item.prefix_end) - column(ctx, item.marker),
                    );
                }
            }
        }
    }
}

impl Rule for Md032 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let body = ctx.source.body_line;
        let blank = |index: Option<usize>| {
            index.is_none_or(|i| {
                i < body || i >= ctx.source.line_count() || is_blank_line(ctx.line(i))
            })
        };
        for list in lists(ctx) {
            if ctx.tree.inside(list.id, |k| {
                matches!(k, Kind::List { .. } | Kind::HtmlBlock)
            }) {
                continue;
            }
            if !blank(list.first.checked_sub(1)) {
                report.context(list.first, ctx.line(list.first).trim(), false, false);
            }
            if !blank(Some(list.last + 1)) {
                report.context(list.last, ctx.line(list.last).trim(), false, false);
            }
        }
    }
}
