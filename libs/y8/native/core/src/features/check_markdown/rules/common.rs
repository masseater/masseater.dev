use std::collections::HashSet;
use std::sync::LazyLock;

use regex::Regex;

use crate::features::check_markdown::rule::Context;
use crate::shared::source::Source;
use crate::shared::tree::{Kind, Node, Tree};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HeadingStyle {
    Atx,
    AtxClosed,
    Setext,
}

impl HeadingStyle {
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Atx => "atx",
            Self::AtxClosed => "atx_closed",
            Self::Setext => "setext",
        }
    }
}

pub struct Heading {
    pub id: u32,
    pub first: usize,
    pub last: usize,
    pub level: u8,
    pub style: HeadingStyle,
    pub text: String,
}

#[must_use]
pub fn lines_of(source: &Source, node: &Node) -> (usize, usize) {
    let first = source.line_of(node.start);
    let mut end = node.end;
    while end > node.start + 1 && source.text.as_bytes()[end - 1] == b'\n' {
        end -= 1;
    }
    (first, source.line_of(end.saturating_sub(1).max(node.start)))
}

fn atx_closed(line: &str) -> bool {
    let trimmed = line.trim_end_matches([' ', '\t']);
    let open = trimmed.len() - trimmed.trim_start_matches('#').len();
    let rest = &trimmed[open..];
    !rest.is_empty() && rest.ends_with('#') && trimmed.trim_end_matches('#').ends_with([' ', '\t'])
}

#[must_use]
pub fn atx_content(line: &str) -> (usize, usize) {
    let open = line.len() - line.trim_start_matches('#').len();
    let start = open + (line[open..].len() - line[open..].trim_start_matches([' ', '\t']).len());
    let trimmed = line.trim_end_matches([' ', '\t']);
    if trimmed.len() <= open {
        return (start.min(line.len()), start.min(line.len()));
    }
    let without = trimmed.trim_end_matches('#');
    let end = if without.len() < trimmed.len()
        && (without.len() <= open || without.ends_with([' ', '\t']))
    {
        without.trim_end_matches([' ', '\t']).len()
    } else {
        trimmed.len()
    };
    (start, end.max(start))
}

#[must_use]
pub fn heading_text(tree: &Tree, source: &Source, id: u32, setext: bool) -> String {
    let node = tree.node(id);
    let (first, last) = lines_of(source, node);
    let (start, end) = if setext {
        let end_line = if last > first { last - 1 } else { first };
        (node.start, source.line_range(end_line).1)
    } else {
        let (_, line_end) = source.line_range(first);
        let (s, e) = atx_content(&source.text[node.start..line_end]);
        (node.start + s, node.start + e)
    };
    let mut text = String::new();
    let mut at = start;
    for (_, child) in tree.descendants(id) {
        if matches!(child.kind, Kind::InlineHtml) && child.start >= at && child.end <= end {
            text.push_str(&source.text[at..child.start]);
            at = child.end;
        }
    }
    if at < end {
        text.push_str(&source.text[at..end]);
    }
    text.split('\n')
        .map(|line| line.trim_start_matches([' ', '\t', '>']))
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_owned()
}

#[must_use]
pub fn headings<'c>(ctx: &Context<'c>) -> &'c [Heading] {
    ctx.cache.headings.get_or_init(|| compute_headings(ctx))
}

fn compute_headings(ctx: &Context<'_>) -> Vec<Heading> {
    ctx.tree
        .iter()
        .filter_map(|(id, node)| match node.kind {
            Kind::Heading { level, setext } => {
                let (first, last) = lines_of(ctx.source, node);
                let style = if setext {
                    HeadingStyle::Setext
                } else if atx_closed(&ctx.source.text[node.start..ctx.source.line_range(first).1]) {
                    HeadingStyle::AtxClosed
                } else {
                    HeadingStyle::Atx
                };
                Some(Heading {
                    id,
                    first,
                    last,
                    level,
                    style,
                    text: heading_text(ctx.tree, ctx.source, id, setext),
                })
            }
            _ => None,
        })
        .collect()
}

pub fn add_range<S: std::hash::BuildHasher>(
    set: &mut HashSet<usize, S>,
    first: usize,
    last: usize,
) {
    set.extend(first..=last);
}

#[must_use]
pub fn block_lines(ctx: &Context<'_>, matches: impl Fn(&Kind) -> bool) -> HashSet<usize> {
    let mut set = HashSet::new();
    for (_, node) in ctx.tree.iter() {
        if matches(&node.kind) {
            let (first, last) = lines_of(ctx.source, node);
            add_range(&mut set, first, last);
        }
    }
    set
}

#[must_use]
pub fn is_code_block(kind: &Kind) -> bool {
    matches!(kind, Kind::CodeBlock { .. })
}

#[must_use]
pub fn is_ignored_block(kind: &Kind) -> bool {
    matches!(kind, Kind::CodeBlock { .. } | Kind::HtmlBlock)
}

#[must_use]
pub fn is_blank_line(line: &str) -> bool {
    let mut s = line.to_owned();
    loop {
        let start = s.find("<!--");
        let end = s.find("-->");
        match (start, end) {
            (start, Some(end)) if start.is_none_or(|start| end < start) => {
                s = s[end + 3..].to_owned();
            }
            (Some(start), Some(end)) => {
                s = format!("{}{}", &s[..start], &s[end + 3..]);
            }
            (Some(start), None) => {
                s.truncate(start);
            }
            _ => break,
        }
    }
    line.trim().is_empty() || s.replace('>', "").trim().is_empty()
}

#[must_use]
pub fn front_matter_has_title(ctx: &Context<'_>) -> bool {
    let pattern = ctx.option("front_matter_title");
    if pattern.and_then(serde_json::Value::as_str) == Some("") {
        return false;
    }
    let source = pattern
        .and_then(serde_json::Value::as_str)
        .unwrap_or(r#"^\s*"?title"?\s*[:=]"#);
    if ctx.source.body_line == 0 {
        return false;
    }
    let Some(re) = cached_regex(&format!("(?i){source}")) else {
        return false;
    };
    (0..ctx.source.body_line).any(|index| re.is_match(ctx.source.line(index)))
}

#[must_use]
pub fn is_comment_html(text: &str) -> bool {
    let text = text.trim_end_matches('\n');
    if !(text.starts_with("<!--") && text.ends_with("-->")) || text.len() < 7 {
        return false;
    }
    let comment = &text[4..text.len() - 3];
    !comment.starts_with('>') && !comment.starts_with("->") && !comment.ends_with('-')
}

#[must_use]
pub fn ignored_block_lines<'c>(ctx: &Context<'c>) -> &'c HashSet<usize> {
    ctx.cache
        .ignored_blocks
        .get_or_init(|| compute_ignored_block_lines(ctx))
}

fn compute_ignored_block_lines(ctx: &Context<'_>) -> HashSet<usize> {
    let mut set = block_lines(ctx, is_ignored_block);
    for &(start, end) in &ctx.tree.math_blocks {
        add_range(
            &mut set,
            ctx.source.line_of(start),
            ctx.source.line_of(end.saturating_sub(1).max(start)),
        );
    }
    set
}

#[must_use]
pub fn is_leaf_block(kind: &Kind) -> bool {
    matches!(
        kind,
        Kind::Paragraph
            | Kind::Heading { .. }
            | Kind::CodeBlock { .. }
            | Kind::HtmlBlock
            | Kind::Table
            | Kind::ThematicBreak
    )
}

#[must_use]
pub fn definition_lines<'c>(ctx: &Context<'c>) -> &'c HashSet<usize> {
    ctx.cache
        .definition_lines
        .get_or_init(|| compute_definition_lines(ctx))
}

fn compute_definition_lines(ctx: &Context<'_>) -> HashSet<usize> {
    let mut covered = ignored_block_lines(ctx).clone();
    covered.extend(block_lines(ctx, |k| {
        is_leaf_block(k)
            || matches!(
                k,
                Kind::Text
                    | Kind::Code
                    | Kind::InlineHtml
                    | Kind::Html
                    | Kind::Math { .. }
                    | Kind::Link { .. }
                    | Kind::Image { .. }
                    | Kind::Emphasis
                    | Kind::Strong
                    | Kind::Strikethrough
            )
    }));
    let mut set = HashSet::new();
    for def in &ctx.tree.definitions {
        add_range(
            &mut set,
            ctx.source.line_of(def.start),
            ctx.source.line_of(def.end.saturating_sub(1).max(def.start)),
        );
    }
    for index in ctx.source.body_lines() {
        if covered.contains(&index) || set.contains(&index) {
            continue;
        }
        let line = ctx.source.line(index);
        let content = line.trim_start_matches([' ', '\t', '>']);
        if content.is_empty() {
            continue;
        }
        let stripped = content
            .trim_start_matches(|c: char| c.is_ascii_digit())
            .trim_start_matches(['-', '*', '+', '.', ')'])
            .trim_start();
        if !stripped.is_empty() && !is_blank_line(line) {
            set.insert(index);
        }
    }
    set
}

#[must_use]
pub fn text_segments<'c>(ctx: &Context<'c>) -> &'c [(u32, usize, usize)] {
    ctx.cache
        .segments
        .get_or_init(|| compute_text_segments(ctx))
}

fn compute_text_segments(ctx: &Context<'_>) -> Vec<(u32, usize, usize)> {
    let mut segments: Vec<(u32, usize, usize)> = Vec::new();
    for (id, node) in ctx.tree.iter() {
        if !matches!(node.kind, Kind::Text) {
            continue;
        }
        let Some(parent) = node.parent else { continue };
        if ctx.tree.inside(id, |k| {
            matches!(k, Kind::HtmlBlock | Kind::CodeBlock { .. })
        }) {
            continue;
        }
        match segments.last_mut() {
            Some(last) if last.0 == parent && last.2 == node.start => last.2 = node.end,
            _ => segments.push((parent, node.start, node.end)),
        }
    }
    segments
}

#[must_use]
pub fn inline_math_spans<'c>(ctx: &Context<'c>) -> &'c [(usize, usize)] {
    ctx.cache
        .math
        .get_or_init(|| compute_inline_math_spans(ctx))
}

fn compute_inline_math_spans(ctx: &Context<'_>) -> Vec<(usize, usize)> {
    let mut spans: Vec<(usize, usize)> = ctx
        .tree
        .iter()
        .filter(|(_, n)| matches!(n.kind, Kind::Code | Kind::Math { .. }))
        .map(|(_, n)| (n.start, n.end))
        .collect();
    let mut code = spans.clone();
    code.sort_unstable();
    let bytes = ctx.source.text.as_bytes();
    let leaves = ctx.tree.iter().filter(|(_, n)| {
        matches!(
            n.kind,
            Kind::Paragraph | Kind::Heading { .. } | Kind::TableCell
        )
    });
    for (_, leaf) in leaves {
        let (start, end) = (leaf.start, leaf.end);
        let mut runs = Vec::new();
        let mut i = start;
        let mut next = code.partition_point(|&(_, e)| e <= start);
        while i < end {
            while next < code.len() && code[next].1 <= i {
                next += 1;
            }
            if next < code.len() && code[next].0 <= i {
                i = code[next].1;
            } else if bytes[i] == b'$' {
                let len = bytes[i..end].iter().take_while(|&&c| c == b'$').count();
                if i == 0 || bytes[i - 1] != b'\\' {
                    runs.push((i, len));
                }
                i += len;
            } else {
                i += 1;
            }
        }
        let mut used = vec![false; runs.len()];
        for open in 0..runs.len() {
            if used[open] {
                continue;
            }
            if let Some(close) =
                (open + 1..runs.len()).find(|&c| !used[c] && runs[c].1 == runs[open].1)
            {
                used[open] = true;
                used[close] = true;
                spans.push((runs[open].0, runs[close].0 + runs[close].1));
            }
        }
    }
    spans
}

static REGEX_CACHE: LazyLock<std::sync::RwLock<std::collections::HashMap<String, Option<Regex>>>> =
    LazyLock::new(Default::default);

#[must_use]
pub fn cached_regex(pattern: &str) -> Option<Regex> {
    if let Some(found) = REGEX_CACHE
        .read()
        .ok()
        .and_then(|cache| cache.get(pattern).cloned())
    {
        return found;
    }
    let compiled = Regex::new(pattern).ok();
    if let Ok(mut cache) = REGEX_CACHE.write() {
        cache.insert(pattern.to_owned(), compiled.clone());
    }
    compiled
}
