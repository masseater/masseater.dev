use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;

use super::autolink::literal_autolinks;
use super::common::{inline_math_spans, is_comment_html, is_leaf_block, text_segments};
use super::headings::rule;
use crate::rule::{Context, Report, Rule, RuleMeta};
use crate::source::utf16_len;
use crate::tree::{Kind, LinkKind, Tree};

rule!(Md033, ["MD033", "no-inline-html"], "Inline HTML", ["html"]);
rule!(
    Md034,
    ["MD034", "no-bare-urls"],
    "Bare URL used",
    ["links", "url"]
);
rule!(
    Md035,
    ["MD035", "hr-style"],
    "Horizontal rule style",
    ["hr"]
);
rule!(
    Md036,
    ["MD036", "no-emphasis-as-heading"],
    "Emphasis used instead of a heading",
    ["headings", "emphasis"]
);
rule!(
    Md037,
    ["MD037", "no-space-in-emphasis"],
    "Spaces inside emphasis markers",
    ["whitespace", "emphasis"]
);
rule!(
    Md038,
    ["MD038", "no-space-in-code"],
    "Spaces inside code span elements",
    ["whitespace", "code"]
);
rule!(
    Md039,
    ["MD039", "no-space-in-links"],
    "Spaces inside link text",
    ["whitespace", "links"]
);
rule!(
    Md042,
    ["MD042", "no-empty-links"],
    "No empty links",
    ["links"]
);
rule!(
    Md045,
    ["MD045", "no-alt-text"],
    "Images should have alternate text (alt text)",
    ["accessibility", "images"]
);
rule!(
    Md049,
    ["MD049", "emphasis-style"],
    "Emphasis style",
    ["emphasis"]
);
rule!(
    Md050,
    ["MD050", "strong-style"],
    "Strong style",
    ["emphasis"]
);

pub struct HtmlTag<'a> {
    pub start: usize,
    pub text: &'a str,
    pub name: &'a str,
    pub close: bool,
    pub in_table: bool,
    pub in_block: bool,
}

static TAG: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"<(?:/[A-Za-z][A-Za-z0-9-]*\s*>|[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>`/]+|'[^']*'|"[^"]*"))?)*\s*/?>)"#,
    )
    .expect("html tag")
});
static TAG_NAME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^<([^!>][^/\s>]*)").expect("tag name"));

fn tag(start: usize, text: &str, in_table: bool, in_block: bool) -> Option<HtmlTag<'_>> {
    let caps = TAG_NAME.captures(text)?;
    let raw = caps.get(1)?.as_str();
    let close = raw.starts_with('/');
    Some(HtmlTag {
        start,
        text,
        name: if close { &raw[1..] } else { raw },
        close,
        in_table,
        in_block,
    })
}

#[must_use]
pub fn html_tags<'a>(ctx: &'a Context<'_>) -> Vec<HtmlTag<'a>> {
    let mut tags = Vec::new();
    for (id, node) in ctx.tree.iter() {
        match node.kind {
            Kind::InlineHtml => {
                let in_table = ctx.tree.inside(id, |k| matches!(k, Kind::Table));
                let text = &ctx.source.text[node.start..node.end];
                if TAG
                    .find(text)
                    .is_none_or(|m| m.start() != 0 || m.end() != text.len())
                {
                    continue;
                }
                if let Some(found) = tag(
                    node.start,
                    &ctx.source.text[node.start..node.end],
                    in_table,
                    false,
                ) {
                    tags.push(found);
                }
            }
            Kind::HtmlBlock => {
                let text = &ctx.source.text[node.start..node.end];
                if is_comment_html(text) {
                    continue;
                }
                let mut code_spans = code_span_ranges(text);
                code_spans.extend(COMMENT.find_iter(text).map(|m| (m.start(), m.end())));
                for found in TAG.find_iter(text) {
                    if code_spans
                        .iter()
                        .any(|&(s, e)| found.start() >= s && found.start() < e)
                    {
                        continue;
                    }
                    if let Some(t) = tag(node.start + found.start(), found.as_str(), false, true) {
                        tags.push(t);
                    }
                }
            }
            _ => {}
        }
    }
    tags.sort_by_key(|t| t.start);
    tags
}

#[must_use]
pub fn code_span_ranges(text: &str) -> Vec<(usize, usize)> {
    let mut ranges = Vec::new();
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'`' {
            let run = bytes[i..].iter().take_while(|&&b| b == b'`').count();
            let fence = &text[i..i + run];
            if let Some(end) = text[i + run..].find(fence).map(|p| i + run + p) {
                let after = end + run;
                if !text[after..].starts_with('`') {
                    ranges.push((i, after));
                    i = after;
                    continue;
                }
            }
            i += run;
        } else {
            i += 1;
        }
    }
    ranges
}

fn first_line_len(text: &str) -> usize {
    utf16_len(text.split(['\n', '\r']).next().unwrap_or(""))
}

impl Rule for Md033 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let lower = |key: &str| -> Option<Vec<String>> {
            ctx.option(key)
                .and_then(serde_json::Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .map(|v| v.as_str().map_or_else(|| v.to_string(), str::to_lowercase))
                        .collect()
                })
        };
        let allowed = lower("allowed_elements").unwrap_or_default();
        let table_allowed = lower("table_allowed_elements").unwrap_or_else(|| allowed.clone());
        for tag in html_tags(ctx).iter().filter(|t| !t.close) {
            let name = tag.name.to_lowercase();
            if (tag.in_table || !allowed.contains(&name))
                && (!tag.in_table || !table_allowed.contains(&name))
            {
                let line = ctx.source.line_of(tag.start);
                report
                    .add(line)
                    .detail(format!("Element: {}", tag.name))
                    .range(ctx.source.column_of(tag.start), first_line_len(tag.text));
            }
        }
    }
}

impl Rule for Md034 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let math = inline_math_spans(ctx);
        let mut by_parent: HashMap<u32, Vec<u32>> = HashMap::new();
        for (id, node) in ctx.tree.iter() {
            if let Some(parent) = node.parent
                && matches!(node.kind, Kind::Text | Kind::InlineHtml)
            {
                by_parent.entry(parent).or_default().push(id);
            }
        }
        let mut parents: Vec<u32> = by_parent.keys().copied().collect();
        parents.sort_unstable();
        for parent in parents {
            if ctx.tree.inside(parent, |k| {
                matches!(k, Kind::Link { .. } | Kind::Image { .. } | Kind::HtmlBlock)
            }) || matches!(
                ctx.tree.node(parent).kind,
                Kind::Link { .. } | Kind::Image { .. } | Kind::HtmlBlock | Kind::CodeBlock { .. }
            ) {
                continue;
            }
            let children = &by_parent[&parent];
            let leaf_start = std::iter::once(parent)
                .chain(ctx.tree.ancestors(parent).map(|(id, _)| id))
                .map(|id| ctx.tree.node(id))
                .find(|n| is_leaf_block(&n.kind) || matches!(n.kind, Kind::TableCell))
                .map_or(ctx.tree.node(parent).start, |n| n.start);
            let mut depth: Vec<String> = Vec::new();
            let mut segments: Vec<(usize, usize)> = Vec::new();
            for &child in children {
                let node = ctx.tree.node(child);
                if matches!(node.kind, Kind::InlineHtml) {
                    if let Some(t) = tag(
                        node.start,
                        &ctx.source.text[node.start..node.end],
                        false,
                        false,
                    ) {
                        if t.close {
                            if let Some(pos) =
                                depth.iter().rposition(|n| n.eq_ignore_ascii_case(t.name))
                            {
                                depth.truncate(pos);
                            }
                        } else if !t.text.ends_with("/>") && !is_void(t.name) {
                            depth.push(t.name.to_owned());
                        }
                    }
                    continue;
                }
                if !depth.is_empty() {
                    continue;
                }
                match segments.last_mut() {
                    Some(last) if last.1 == node.start => last.1 = node.end,
                    _ => segments.push((node.start, node.end)),
                }
            }
            for (start, end) in segments {
                for (s, e) in literal_autolinks(&ctx.source.text, start, end, |at| {
                    unbalanced_label(ctx, math, leaf_start, at)
                }) {
                    if ctx.source.text[..s].ends_with('<') && ctx.source.text[e..].starts_with('>')
                    {
                        continue;
                    }
                    let url = &ctx.source.text[s..e];
                    report
                        .context(ctx.source.line_of(s), url, false, false)
                        .range(ctx.source.column_of(s), utf16_len(url));
                }
            }
        }
    }
}

fn is_void(name: &str) -> bool {
    matches!(
        name.to_lowercase().as_str(),
        "area"
            | "base"
            | "br"
            | "col"
            | "embed"
            | "hr"
            | "img"
            | "input"
            | "link"
            | "meta"
            | "source"
            | "track"
            | "wbr"
    )
}

impl Rule for Md035 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut style = ctx.str_option("style", "consistent").trim().to_owned();
        for (_, node) in ctx.tree.iter() {
            if !matches!(node.kind, Kind::ThematicBreak) {
                continue;
            }
            let line = ctx.source.line_of(node.start);
            let text = ctx.source.text[node.start..ctx.source.line_range(line).1].trim_end();
            if style == "consistent" {
                text.clone_into(&mut style);
            }
            report.expected(line, &style, text);
        }
    }
}

impl Rule for Md036 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let punctuation = ctx.option("punctuation").map_or_else(
            || ".,;:!?。，；：！？".to_owned(),
            |v| v.as_str().map_or_else(|| v.to_string(), str::to_owned),
        );
        for (start, text) in emphasis_paragraphs(ctx.tree, &ctx.source.text, &punctuation) {
            report.context(ctx.source.line_of(start), text, false, false);
        }
        for &id in &ctx.tree.node(0).children {
            let node = ctx.tree.node(id);
            if !matches!(node.kind, Kind::HtmlBlock)
                || is_comment_html(&ctx.source.text[node.start..node.end])
            {
                continue;
            }
            let (reduced, map) = strip_html(&ctx.source.text[node.start..node.end]);
            let tree = Tree::parse(&reduced, 0);
            for (start, text) in emphasis_paragraphs(&tree, &reduced, &punctuation) {
                report.context(
                    ctx.source.line_of(node.start + map[start]),
                    text,
                    false,
                    false,
                );
            }
        }
    }
}

fn strip_html(text: &str) -> (String, Vec<usize>) {
    let mut reduced = String::with_capacity(text.len());
    let mut map = Vec::with_capacity(text.len() + 1);
    let mut skip = vec![false; text.len()];
    for found in COMMENT.find_iter(text).chain(TAG.find_iter(text)) {
        skip[found.start()..found.end()].fill(true);
    }
    let mut line_start = true;
    for (index, ch) in text.char_indices() {
        if skip[index] || (line_start && (ch == ' ' || ch == '\t')) {
            continue;
        }
        line_start = ch == '\n';
        reduced.push(ch);
        map.extend(std::iter::repeat_n(index, ch.len_utf8()));
    }
    map.push(text.len());
    (reduced, map)
}

static COMMENT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)<!--.*?-->").expect("comment"));

fn emphasis_paragraphs<'a>(
    tree: &Tree,
    source: &'a str,
    punctuation: &str,
) -> Vec<(usize, &'a str)> {
    let mut found = Vec::new();
    for &id in &tree.node(0).children {
        let paragraph = tree.node(id);
        if !matches!(paragraph.kind, Kind::Paragraph) {
            continue;
        }
        let meaningful: Vec<u32> = paragraph
            .children
            .iter()
            .copied()
            .filter(|&c| {
                let node = tree.node(c);
                match node.kind {
                    Kind::InlineHtml => false,
                    Kind::Text | Kind::SoftBreak => !source[node.start..node.end].trim().is_empty(),
                    _ => true,
                }
            })
            .collect();
        let [only] = meaningful.as_slice() else {
            continue;
        };
        let node = tree.node(*only);
        if !matches!(node.kind, Kind::Emphasis | Kind::Strong) {
            continue;
        }
        let [inner] = node.children.as_slice() else {
            continue;
        };
        if !matches!(tree.node(*inner).kind, Kind::Text) {
            continue;
        }
        let marker = if matches!(node.kind, Kind::Strong) {
            2
        } else {
            1
        };
        let text = &source[node.start + marker..node.end - marker];
        if text.contains('\n')
            || text
                .chars()
                .next_back()
                .is_some_and(|c| punctuation.contains(c))
        {
            continue;
        }
        found.push((node.start, text));
    }
    found
}

const MARKERS: [&str; 6] = ["_", "__", "___", "*", "**", "***"];

fn marker_runs(source: &str, start: usize, end: usize) -> Vec<(usize, &str)> {
    let mut runs = Vec::new();
    let bytes = source.as_bytes();
    let mut i = start;
    while i < end {
        let b = bytes[i];
        if b == b'*' || b == b'_' {
            let len = bytes[i..end].iter().take_while(|&&c| c == b).count();
            let escaped = i > 0 && bytes[i - 1] == b'\\';
            let (at, len) = if escaped { (i + 1, len - 1) } else { (i, len) };
            if (1..=3).contains(&len) {
                runs.push((at, &source[at..at + len]));
            }
            i = at + len.max(1);
        } else {
            i += 1;
        }
    }
    runs
}

impl Rule for Md037 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let math = inline_math_spans(ctx);
        let mut by_parent: HashMap<u32, Vec<(usize, &str)>> = HashMap::new();
        for &(parent, s, e) in text_segments(ctx) {
            let span = matches!(
                ctx.tree.node(parent).kind,
                Kind::Emphasis
                    | Kind::Strong
                    | Kind::Strikethrough
                    | Kind::Link { .. }
                    | Kind::Image { .. }
            );
            let runs = marker_runs(&ctx.source.text, s, e);
            if span && !(runs.len() == 1 && runs[0].0 == s && s + runs[0].1.len() == e) {
                continue;
            }
            by_parent.entry(parent).or_default().extend(
                runs.into_iter()
                    .filter(|(at, _)| !math.iter().any(|&(ms, me)| *at >= ms && *at < me)),
            );
        }
        let mut parents: Vec<u32> = by_parent.keys().copied().collect();
        parents.sort_unstable();
        for parent in parents {
            let runs = &by_parent[&parent];
            for marker in MARKERS {
                let matching: Vec<usize> = runs
                    .iter()
                    .filter(|(_, m)| *m == marker)
                    .map(|(s, _)| *s)
                    .collect();
                for pair in matching.as_chunks::<2>().0 {
                    let (start, end) = (pair[0], pair[1]);
                    let start_line = ctx.source.line_of(start);
                    let (_, start_line_end) = ctx.source.line_range(start_line);
                    let after = &ctx.source.sanitized[start + marker.len()..start_line_end];
                    let space = after.len() - after.trim_start().len();
                    if space > 0 && after.len() > space {
                        let first = &after
                            [..space + after[space..].chars().next().map_or(0, char::len_utf8)];
                        report
                            .add(start_line)
                            .context(format!("{marker}{first}"))
                            .range(
                                ctx.source.column_of(start + marker.len()),
                                utf16_len(first) - 1,
                            );
                    }
                    let end_line = ctx.source.line_of(end);
                    let (end_line_start, _) = ctx.source.line_range(end_line);
                    let before = &ctx.source.sanitized[end_line_start..end];
                    let trimmed = before.trim_end();
                    let space = before.len() - trimmed.len();
                    if space > 0 && !trimmed.is_empty() {
                        let last = trimmed.chars().next_back().map_or(0, char::len_utf8);
                        let context = &before[trimmed.len() - last..];
                        let column = ctx.source.column_of(end) - (utf16_len(context) - 1);
                        report
                            .add(end_line)
                            .context(format!("{context}{marker}"))
                            .range(column, utf16_len(context) - 1);
                    }
                }
            }
        }
    }
}

impl Rule for Md038 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for (_, node) in ctx.tree.iter() {
            if !matches!(node.kind, Kind::Code) {
                continue;
            }
            let full = &ctx.source.text[node.start..node.end];
            let ticks = full.len() - full.trim_start_matches('`').len();
            if full.len() < ticks * 2 {
                continue;
            }
            let inner_start = node.start + ticks;
            let inner_end = node.end - ticks;
            let inner = &ctx.source.text[inner_start..inner_end];
            let is_space = |c: char| c == ' ' || c == '\n';
            let padded = inner.len() >= 2
                && inner.starts_with(is_space)
                && inner.ends_with(is_space)
                && !inner.chars().all(is_space);
            let (data_start, data_end) = if padded {
                (inner_start + 1, inner_end - 1)
            } else {
                (inner_start, inner_end)
            };
            if data_start >= data_end || inner.trim().is_empty() && !padded {
                continue;
            }
            let data = &ctx.source.text[data_start..data_end];
            let start_data = data.split('\n').next().unwrap_or("");
            let end_data = data.rsplit('\n').next().unwrap_or("");
            let start_ws = start_data.len() - start_data.trim_start().len();
            let start_backtick = start_data[start_ws..].starts_with('`');
            let start_count = if start_ws > 0 && start_ws < start_data.len() {
                start_ws - usize::from(start_backtick && !padded)
            } else {
                0
            };
            let end_ws = end_data.len() - end_data.trim_end().len();
            let end_backtick = end_data[..end_data.len() - end_ws].ends_with('`');
            let end_count = if end_ws > 0 && end_ws < end_data.len() {
                end_ws - usize::from(end_backtick && !padded)
            } else {
                0
            };
            let remove_padding =
                start_count > 0 && end_count > 0 && padded && !start_backtick && !end_backtick;
            let context = full.replace('\n', " ");
            if start_count > 0 {
                let column_offset = if remove_padding {
                    data_start - 1
                } else {
                    data_start
                };
                let length = start_count + usize::from(remove_padding);
                report
                    .context(ctx.source.line_of(data_start), &context, true, false)
                    .range(ctx.source.column_of(column_offset), length);
            }
            if end_count > 0 {
                let end_offset = if remove_padding {
                    data_end + 1
                } else {
                    data_end
                };
                let length = end_count + usize::from(remove_padding);
                report
                    .context(
                        ctx.source
                            .line_of(data_end.saturating_sub(1).max(data_start)),
                        &context,
                        false,
                        true,
                    )
                    .range(ctx.source.column_of(end_offset) - length, length);
            }
        }
    }
}

#[must_use]
pub fn label_range(ctx: &Context<'_>, start: usize, end: usize) -> Option<(usize, usize)> {
    let text = &ctx.source.text[start..end];
    let open = text.find('[')?;
    let mut depth = 0i32;
    let mut i = open;
    let bytes = text.as_bytes();
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => i += 1,
            b'[' => depth += 1,
            b']' => {
                depth -= 1;
                if depth == 0 {
                    return Some((start + open + 1, start + i));
                }
            }
            b'`' => {
                let run = bytes[i..].iter().take_while(|&&c| c == b'`').count();
                let fence = &text[i..i + run];
                if let Some(close) = text[i + run..].find(fence) {
                    i += run + close + run;
                    continue;
                }
                i += run;
                continue;
            }
            _ => {}
        }
        i += 1;
    }
    None
}

impl Rule for Md039 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for (_, node) in ctx.tree.iter() {
            let Kind::Link { link, .. } = &node.kind else {
                continue;
            };
            if matches!(link, LinkKind::Autolink | LinkKind::Email) {
                continue;
            }
            let Some((start, end)) = label_range(ctx, node.start, node.end) else {
                continue;
            };
            let text = &ctx.source.text[start..end];
            let label_context = collapse_ws(&ctx.source.text[start - 1..=end]);
            if text.trim_start().len() != text.len() {
                let lead = text.len() - text.trim_start_matches([' ', '\t']).len();
                if lead > 0 {
                    report
                        .context(ctx.source.line_of(start), &label_context, true, false)
                        .range(ctx.source.column_of(start), lead);
                } else {
                    report.context(ctx.source.line_of(start) + 1, &label_context, true, false);
                }
            }
            if text.trim_end().len() != text.len() {
                let trail = text.len() - text.trim_end_matches([' ', '\t']).len();
                if trail > 0 {
                    report
                        .context(ctx.source.line_of(end), &label_context, false, true)
                        .range(ctx.source.column_of(end) - trail, trail);
                } else {
                    report.context(
                        ctx.source.line_of(end).saturating_sub(1),
                        &label_context,
                        false,
                        true,
                    );
                }
            }
        }
    }
}

fn collapse_ws(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut in_ws = false;
    for c in text.chars() {
        if c.is_whitespace() {
            if !in_ws {
                out.push(' ');
            }
            in_ws = true;
        } else {
            out.push(c);
            in_ws = false;
        }
    }
    out
}

impl Rule for Md042 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for (_, node) in ctx.tree.iter() {
            let Kind::Link {
                link, destination, ..
            } = &node.kind
            else {
                continue;
            };
            if matches!(link, LinkKind::Autolink | LinkKind::Email) {
                continue;
            }
            let empty = match link {
                LinkKind::Inline => {
                    let raw = &ctx.source.text[node.start..node.end];
                    let resource = raw.rfind("](").map_or("", |p| &raw[p + 2..raw.len() - 1]);
                    let dest = resource.trim();
                    let dest = dest
                        .strip_prefix('<')
                        .and_then(|d| d.split_once('>'))
                        .map_or_else(|| dest.split_whitespace().next().unwrap_or(""), |(d, _)| d);
                    dest.is_empty() || dest.trim() == "#"
                }
                _ => destination == "#",
            };
            if empty {
                let text = &ctx.source.text[node.start..node.end];
                report
                    .context(ctx.source.line_of(node.start), text, false, false)
                    .range(ctx.source.column_of(node.start), utf16_len(text));
            }
        }
    }
}

static ALT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)\salt\s*=\s*['"]?([^'"\s>]*)"#).expect("alt"));
static ARIA_HIDDEN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)\saria-hidden\s*=\s*['"]?([^'"\s>]*)"#).expect("aria"));

impl Rule for Md045 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for (id, node) in ctx.tree.iter() {
            if !matches!(node.kind, Kind::Image { .. }) {
                continue;
            }
            let Some((start, end)) = label_range(ctx, node.start, node.end) else {
                continue;
            };
            let _ = id;
            if start == end {
                let first = ctx.source.line_of(node.start);
                let last = ctx.source.line_of(node.end - 1);
                let finding = report.add(first);
                if first == last {
                    finding.range(
                        ctx.source.column_of(node.start),
                        utf16_len(&ctx.source.text[node.start..node.end]),
                    );
                }
            }
        }
        for tag in html_tags(ctx) {
            if !tag.close
                && tag.name.eq_ignore_ascii_case("img")
                && !ALT.is_match(tag.text)
                && ARIA_HIDDEN
                    .captures(tag.text)
                    .is_none_or(|c| !c[1].eq_ignore_ascii_case("true"))
            {
                report
                    .add(ctx.source.line_of(tag.start))
                    .range(ctx.source.column_of(tag.start), first_line_len(tag.text));
            }
        }
    }
}

fn emphasis_style(ctx: &Context<'_>, report: &mut Report, strong: bool, configured: &str) {
    let mut style = configured.to_owned();
    let width = if strong { 2 } else { 1 };
    for (id, node) in ctx.tree.iter() {
        let matches = if strong {
            matches!(node.kind, Kind::Strong)
        } else {
            matches!(node.kind, Kind::Emphasis)
        };
        if !matches || ctx.tree.inside(id, |k| matches!(k, Kind::HtmlBlock)) {
            continue;
        }
        let Some(first) = ctx.source.text[node.start..].chars().next() else {
            continue;
        };
        let markup = if first == '*' {
            "asterisk"
        } else {
            "underscore"
        };
        if style == "consistent" {
            markup.clone_into(&mut style);
        }
        if style == markup {
            continue;
        }
        let intraword = |c: Option<char>| c.is_some_and(|c| c.is_ascii_alphanumeric() || c == '_');
        let before = ctx.source.text[..node.start]
            .chars()
            .next_back()
            .filter(|&c| c != '\n');
        let after = ctx.source.text[node.end..]
            .chars()
            .next()
            .filter(|&c| c != '\n');
        if style == "underscore" && (intraword(before) || intraword(after)) {
            continue;
        }
        for start in [node.start, node.end - width] {
            report
                .add(ctx.source.line_of(start))
                .detail(format!("Expected: {style}; Actual: {markup}"))
                .range(ctx.source.column_of(start), width);
        }
    }
}

impl Rule for Md049 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx.str_option("style", "consistent").to_owned();
        let style = if style.is_empty() {
            "consistent".to_owned()
        } else {
            style
        };
        emphasis_style(ctx, report, false, &style);
    }
}

impl Rule for Md050 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx.str_option("style", "consistent").to_owned();
        let style = if style.is_empty() {
            "consistent".to_owned()
        } else {
            style
        };
        emphasis_style(ctx, report, true, &style);
    }
}

fn unbalanced_label(ctx: &Context<'_>, math: &[(usize, usize)], from: usize, to: usize) -> bool {
    let text = &ctx.source.text[from..to];
    let bytes = text.as_bytes();
    let mut code = code_span_ranges(text);
    code.extend(
        math.iter()
            .filter(|&&(s, e)| s < to && e > from)
            .map(|&(s, e)| (s.saturating_sub(from), e - from)),
    );
    let mut depth = 0usize;
    let mut i = 0;
    while i < bytes.len() {
        if code.iter().any(|&(s, e)| i >= s && i < e) {
            i += 1;
            continue;
        }
        match bytes[i] {
            b'\\' => i += 1,
            b'[' => depth += 1,
            b']' => depth = depth.saturating_sub(1),
            _ => {}
        }
        i += 1;
    }
    depth > 0
}

#[must_use]
pub fn bare_urls(text: &str) -> Vec<(usize, usize)> {
    literal_autolinks(text, 0, text.len(), |_| false)
}

#[must_use]
pub fn html_text_runs(text: &str) -> Vec<(usize, usize)> {
    let mut covered: Vec<(usize, usize)> = COMMENT
        .find_iter(text)
        .chain(TAG.find_iter(text))
        .map(|m| (m.start(), m.end()))
        .collect();
    covered.sort_unstable();
    let mut runs = Vec::new();
    let mut at = 0;
    for (start, end) in covered {
        if start > at {
            runs.push((at, start));
        }
        at = at.max(end);
    }
    if at < text.len() {
        runs.push((at, text.len()));
    }
    runs
}
