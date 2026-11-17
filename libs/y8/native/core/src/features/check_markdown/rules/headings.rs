use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use super::common::{
    Heading, HeadingStyle, front_matter_has_title, headings, ignored_block_lines, is_blank_line,
    is_comment_html,
};
use crate::features::check_markdown::rule::{Context, Report, Rule, RuleMeta};
use crate::shared::source::utf16_len;
use crate::shared::tree::Kind;

macro_rules! rule {
    ($ty:ident, [$($name:literal),+], $description:literal, [$($tag:literal),*]) => {
        pub struct $ty;
        impl $ty {
            const META: RuleMeta = RuleMeta {
                names: &[$($name),+],
                description: $description,
                tags: &[$($tag),*],
            };
        }
    };
}
pub(crate) use rule;

rule!(
    Md001,
    ["MD001", "heading-increment"],
    "Heading levels should only increment by one level at a time",
    ["headings"]
);
rule!(
    Md003,
    ["MD003", "heading-style"],
    "Heading style",
    ["headings"]
);
rule!(
    Md018,
    ["MD018", "no-missing-space-atx"],
    "No space after hash on atx style heading",
    ["headings", "atx", "spaces"]
);
rule!(
    Md019,
    ["MD019", "no-multiple-space-atx"],
    "Multiple spaces after hash on atx style heading",
    ["headings", "atx", "spaces"]
);
rule!(
    Md020,
    ["MD020", "no-missing-space-closed-atx"],
    "No space inside hashes on closed atx style heading",
    ["headings", "atx_closed", "spaces"]
);
rule!(
    Md021,
    ["MD021", "no-multiple-space-closed-atx"],
    "Multiple spaces inside hashes on closed atx style heading",
    ["headings", "atx_closed", "spaces"]
);
rule!(
    Md022,
    ["MD022", "blanks-around-headings"],
    "Headings should be surrounded by blank lines",
    ["headings", "blank_lines"]
);
rule!(
    Md023,
    ["MD023", "heading-start-left"],
    "Headings must start at the beginning of the line",
    ["headings", "spaces"]
);
rule!(
    Md024,
    ["MD024", "no-duplicate-heading"],
    "Multiple headings with the same content",
    ["headings"]
);
rule!(
    Md025,
    ["MD025", "single-title", "single-h1"],
    "Multiple top-level headings in the same document",
    ["headings"]
);
rule!(
    Md026,
    ["MD026", "no-trailing-punctuation"],
    "Trailing punctuation in heading",
    ["headings"]
);
rule!(
    Md041,
    ["MD041", "first-line-heading", "first-line-h1"],
    "First line in a file should be a top-level heading",
    ["headings"]
);
rule!(
    Md043,
    ["MD043", "required-headings"],
    "Required heading structure",
    ["headings"]
);

impl Rule for Md001 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut previous = if front_matter_has_title(ctx) {
            1
        } else {
            u8::MAX
        };
        for heading in headings(ctx) {
            if heading.level > previous {
                report.expected(
                    heading.first,
                    &format!("h{}", previous + 1),
                    &format!("h{}", heading.level),
                );
            }
            previous = heading.level;
        }
    }
}

impl Rule for Md003 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let mut style = ctx.str_option("style", "consistent").to_owned();
        for heading in headings(ctx) {
            let actual = heading.style.name();
            if style == "consistent" {
                actual.clone_into(&mut style);
            }
            if actual == style {
                continue;
            }
            let h12 = heading.level <= 2;
            let with_atx = style == "setext_with_atx"
                && (h12 && heading.style == HeadingStyle::Setext
                    || !h12 && heading.style == HeadingStyle::Atx);
            let with_closed = style == "setext_with_atx_closed"
                && (h12 && heading.style == HeadingStyle::Setext
                    || !h12 && heading.style == HeadingStyle::AtxClosed);
            if with_atx || with_closed {
                continue;
            }
            let expected = match style.as_str() {
                "setext_with_atx" | "setext_with_atx_closed" if h12 => "setext",
                "setext_with_atx" => "atx",
                "setext_with_atx_closed" => "atx_closed",
                other => other,
            };
            report.expected(heading.first, expected, actual);
        }
    }
}

static MISSING_SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^#+[^# \t]").expect("md018"));
static ENDS_WITH_HASH: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"#\s*$").expect("md018"));

impl Rule for Md018 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ignored = ignored_block_lines(ctx);
        for index in ctx.source.body_lines() {
            let line = ctx.line(index);
            if !ignored.contains(&index)
                && MISSING_SPACE.is_match(line)
                && !ENDS_WITH_HASH.is_match(line)
                && !line.starts_with("#\u{fe0f}\u{20e3}")
            {
                let hashes = line.len() - line.trim_start_matches('#').len();
                report
                    .context(index, line.trim(), false, false)
                    .range(1, hashes + 1);
            }
        }
    }
}

struct AtxParts<'a> {
    text: &'a str,
    column: usize,
    open: usize,
    open_space: &'a str,
    close_space: Option<(usize, &'a str)>,
}

fn atx_parts<'a>(ctx: &'a Context<'_>, heading: &Heading) -> AtxParts<'a> {
    let node = ctx.tree.node(heading.id);
    let (line_start, line_end) = ctx.source.line_range(heading.first);
    let text = &ctx.source.sanitized[node.start..line_end];
    let column = utf16_len(&ctx.source.text[line_start..node.start]) + 1;
    let open = text.len() - text.trim_start_matches('#').len();
    let after = &text[open..];
    let open_space = &after[..after.len() - after.trim_start_matches([' ', '\t']).len()];
    let close_space = (heading.style == HeadingStyle::AtxClosed).then(|| {
        let trimmed = text.trim_end_matches([' ', '\t']);
        let without = trimmed.trim_end_matches('#');
        let inner = without.trim_end_matches([' ', '\t']);
        (inner.len(), &without[inner.len()..])
    });
    AtxParts {
        text,
        column,
        open,
        open_space,
        close_space,
    }
}

fn multiple_space(report: &mut Report, ctx: &Context<'_>, heading: &Heading, start: bool) {
    let parts = atx_parts(ctx, heading);
    let found = if start {
        (parts.open_space.len() > 1).then_some((parts.open, parts.open_space))
    } else {
        parts.close_space.filter(|(_, space)| space.len() > 1)
    };
    if let Some((offset, space)) = found {
        let column = parts.column + utf16_len(&parts.text[..offset]) + 1;
        report
            .context(heading.first, parts.text.trim(), start, !start)
            .range(column, space.len() - 1);
    }
}

impl Rule for Md019 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for heading in headings(ctx)
            .iter()
            .filter(|h| h.style == HeadingStyle::Atx)
        {
            multiple_space(report, ctx, heading, true);
        }
    }
}

impl Rule for Md021 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for heading in headings(ctx)
            .iter()
            .filter(|h| h.style == HeadingStyle::AtxClosed)
        {
            multiple_space(report, ctx, heading, true);
            multiple_space(report, ctx, heading, false);
        }
    }
}

static CLOSED_NO_SPACE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(#+)([ \t]*)([^# \t\\]|[^# \t][^#]*?[^# \t\\])([ \t]*)((?:\\#)?)(#+)(\s*)$")
        .expect("md020")
});

impl Rule for Md020 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ignored = ignored_block_lines(ctx);
        for index in ctx.source.body_lines() {
            if ignored.contains(&index) {
                continue;
            }
            let line = ctx.line(index);
            let Some(caps) = CLOSED_NO_SPACE.captures(line) else {
                continue;
            };
            let left = caps[2].is_empty();
            let right = caps[4].is_empty() || !caps[5].is_empty();
            if left || right {
                let range = if left {
                    (1, caps[1].len() + 1)
                } else {
                    let length = utf16_len(line);
                    (length - caps[7].len() - caps[6].len(), caps[6].len() + 1)
                };
                report
                    .context(index, line.trim(), left, right)
                    .range(range.0, range.1);
            }
        }
    }
}

fn lines_setting(value: Option<&Value>, level: u8) -> i64 {
    match value {
        Some(Value::Array(items)) => items
            .get(usize::from(level) - 1)
            .and_then(Value::as_i64)
            .unwrap_or(1),
        Some(Value::Number(n)) => n.as_i64().unwrap_or(1),
        Some(Value::Bool(b)) => i64::from(*b),
        _ => 1,
    }
}

impl Rule for Md022 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let include_front = ctx.bool_option("include_front_matter", false);
        let body = ctx.source.body_line;
        let line_at = |index: i64| -> String {
            if index >= body as i64 && (index as usize) < ctx.source.line_count() {
                ctx.line(index as usize).to_owned()
            } else if include_front && index >= 0 && index < body as i64 {
                ctx.source.line(index as usize).to_owned()
            } else {
                String::new()
            }
        };
        for heading in headings(ctx) {
            let text = ctx.line(heading.first).trim().to_owned();
            let above = lines_setting(ctx.option("lines_above"), heading.level);
            if above >= 0 {
                let mut actual = 0;
                while actual < above && is_blank_line(&line_at(heading.first as i64 - 1 - actual)) {
                    actual += 1;
                }
                if let Some(f) =
                    report.expected(heading.first, &above.to_string(), &actual.to_string())
                {
                    f.detail = f.detail.take().map(|d| format!("{d}; Above"));
                    f.context(text.clone());
                }
            }
            let below = lines_setting(ctx.option("lines_below"), heading.level);
            if below >= 0 {
                let mut actual = 0;
                while actual < below && is_blank_line(&line_at(heading.last as i64 + 1 + actual)) {
                    actual += 1;
                }
                if let Some(f) =
                    report.expected(heading.first, &below.to_string(), &actual.to_string())
                {
                    f.detail = f.detail.take().map(|d| format!("{d}; Below"));
                    f.context(text.clone());
                }
            }
        }
    }
}

impl Rule for Md023 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for heading in headings(ctx) {
            let node = ctx.tree.node(heading.id);
            let (line_start, _) = ctx.source.line_range(heading.first);
            let content = content_start(ctx, heading.id, heading.first);
            if content < node.start {
                let indent = &ctx.source.text[content..node.start];
                if indent.chars().all(|c| c == ' ' || c == '\t') {
                    let column = utf16_len(&ctx.source.text[line_start..content]) + 1;
                    report
                        .context(heading.first, ctx.line(heading.first), true, false)
                        .range(column, utf16_len(indent));
                }
            }
        }
    }
}

#[must_use]
pub fn item_content_offset(ctx: &Context<'_>, item_start: usize) -> usize {
    let rest =
        &ctx.source.text[item_start..ctx.source.line_range(ctx.source.line_of(item_start)).1];
    let marker = if rest.starts_with(['-', '*', '+']) {
        1
    } else {
        rest.len() - rest.trim_start_matches(|c: char| c.is_ascii_digit()).len() + 1
    };
    let after = &rest[marker.min(rest.len())..];
    let spaces = after.len() - after.trim_start_matches(' ').len();
    let spaces = if spaces == 0 || spaces > 4 || spaces == after.len() {
        1.min(spaces)
    } else {
        spaces
    };
    item_start + marker.min(rest.len()) + spaces
}

#[must_use]
pub fn content_start(ctx: &Context<'_>, id: u32, line: usize) -> usize {
    let (line_start, _) = ctx.source.line_range(line);
    for (_, ancestor) in ctx.tree.ancestors(id) {
        match ancestor.kind {
            Kind::BlockQuote => {
                let (_, line_end) = ctx.source.line_range(line);
                let line_text = &ctx.source.text[line_start..line_end];
                let lead = line_text.len() - line_text.trim_start_matches([' ', '\t', '>']).len();
                let prefix = &line_text[..lead];
                if let Some(pos) = prefix.rfind('>') {
                    let after = line_start + pos + 1;
                    return if ctx.source.text[after..].starts_with([' ', '\t']) {
                        after + 1
                    } else {
                        after
                    };
                }
                return line_start;
            }
            Kind::ListItem => {
                let item_line = ctx.source.line_of(ancestor.start);
                let offset = item_content_offset(ctx, ancestor.start);
                if item_line == line {
                    return offset;
                }
                let column = offset - ctx.source.line_range(item_line).0;
                return (line_start + column).min(ctx.tree.node(id).start);
            }
            _ => {}
        }
    }
    line_start
}

impl Rule for Md024 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let siblings = ctx.bool_option("siblings_only", false);
        let mut known: Vec<Vec<String>> = vec![Vec::new(); 8];
        let mut last = 1usize;
        for heading in headings(ctx) {
            let level = usize::from(heading.level);
            let slot = if siblings {
                while last < level {
                    last += 1;
                    known[last].clear();
                }
                while last > level {
                    known[last].clear();
                    last -= 1;
                }
                level
            } else {
                1
            };
            if known[slot].contains(&heading.text) {
                report.context(heading.first, heading.text.trim(), false, false);
            } else {
                known[slot].push(heading.text.clone());
            }
        }
    }
}

#[must_use]
pub fn is_docfx_tab(ctx: &Context<'_>, heading: &Heading) -> bool {
    if heading.style == HeadingStyle::Setext {
        return false;
    }
    let node = ctx.tree.node(heading.id);
    match node.children.as_slice() {
        [only] => matches!(
            &ctx.tree.node(*only).kind,
            Kind::Link { destination, .. } if destination.starts_with("#tab/")
        ),
        _ => false,
    }
}

fn first_content(ctx: &Context<'_>) -> Option<u32> {
    let root = ctx.tree.node(0);
    let first_block = root.children.iter().copied().find(|&id| {
        let node = ctx.tree.node(id);
        !(matches!(node.kind, Kind::HtmlBlock)
            && is_comment_html(&ctx.source.text[node.start..node.end]))
    });
    let first_definition = ctx.tree.definitions.iter().map(|d| d.start).min();
    match (first_block, first_definition) {
        (Some(block), Some(def)) if def < ctx.tree.node(block).start => None,
        (block, None) => block,
        (None, Some(_)) => None,
        (Some(block), Some(_)) => Some(block),
    }
}

impl Rule for Md025 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let level = ctx.uint_option("level", 1);
        let all = headings(ctx);
        let matching: Vec<&Heading> = all
            .iter()
            .filter(|h| u64::from(h.level) == level && !is_docfx_tab(ctx, h))
            .collect();
        let Some(first) = matching.first() else {
            return;
        };
        let title = front_matter_has_title(ctx);
        let top = title || first_content(ctx) == Some(first.id);
        if top {
            for heading in matching.iter().skip(usize::from(!title)) {
                report.context(heading.first, &heading.text, false, false);
            }
        }
    }
}

static ENTITY_END: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"&(?:#\d+|#[xX][\da-fA-F]+|[a-zA-Z]{2,31}|blk\d{2}|emsp1[34]|frac\d{2}|sup\d|there4);$",
    )
    .expect("entity")
});
static GEMOJI_END: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r":(?:[abmovx]|[-+]1|100|1234|(?:1st|2nd|3rd)_place_medal|8ball|clock\d{1,4}|e-mail|non-potable_water|o2|t-rex|u5272|u5408|u55b6|u6307|u6708|u6709|u6e80|u7121|u7533|u7981|u7a7a|[a-z]{2,15}2?|[a-z]{1,14}(?:_[a-z\d]{1,16})+):$")
        .expect("gemoji")
});

fn heading_content_end<'a>(ctx: &'a Context<'_>, heading: &Heading) -> (usize, &'a str, usize) {
    let node = ctx.tree.node(heading.id);
    let (line, start, end) = if heading.style == HeadingStyle::Setext {
        let line = if heading.last > heading.first {
            heading.last - 1
        } else {
            heading.first
        };
        let (line_start, line_end) = ctx.source.line_range(line);
        let start = if line == heading.first {
            node.start
        } else {
            line_start
        };
        let text = ctx.source.text[start..line_end].trim_end_matches([' ', '\t']);
        (line, start, start + text.len())
    } else {
        let (_, line_end) = ctx.source.line_range(heading.first);
        let (s, e) = super::common::atx_content(&ctx.source.text[node.start..line_end]);
        (heading.first, node.start + s, node.start + e)
    };
    let line_start = ctx.source.line_range(line).0;
    let end_column = utf16_len(&ctx.source.text[line_start..end]) + 1;
    (line, &ctx.source.text[start..end], end_column)
}

impl Rule for Md026 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let punctuation = ctx.option("punctuation").map_or_else(
            || ".,;:!。，；：！".to_owned(),
            |v| v.as_str().map_or_else(|| v.to_string(), str::to_owned),
        );
        if punctuation.is_empty() {
            return;
        }
        let Some(trailing) =
            super::common::cached_regex(&format!(r"\s*[{}]+$", regex::escape(&punctuation)))
        else {
            return;
        };
        for heading in headings(ctx) {
            let (line, text, end_column) = heading_content_end(ctx, heading);
            if let Some(found) = trailing.find(text)
                && !ENTITY_END.is_match(text)
                && !GEMOJI_END.is_match(text)
            {
                let length = utf16_len(found.as_str());
                report
                    .add(line)
                    .detail(format!("Punctuation: '{}'", found.as_str()))
                    .range(end_column - length, length);
            }
        }
    }
}

static HEADING_TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^<(h[1-6])[\s/>]").expect("heading tag"));
static TAG_NAME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^<([^!>][^/\s>]*)").expect("tag"));

impl Rule for Md041 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        if front_matter_has_title(ctx) {
            return;
        }
        let preamble = ctx.bool_option("allow_preamble", false);
        let level = ctx.uint_option("level", 1);
        let root = ctx.tree.node(0);
        let mut blocks: Vec<(usize, u32)> = root
            .children
            .iter()
            .map(|&id| (ctx.tree.node(id).start, id))
            .collect();
        blocks.extend(ctx.tree.definitions.iter().map(|d| (d.start, u32::MAX)));
        blocks.sort_unstable();
        for (start, id) in blocks {
            let line = ctx.source.line_of(start);
            if id == u32::MAX {
                if !preamble {
                    report.context(line, ctx.line(line), false, false);
                    return;
                }
                continue;
            }
            let node = ctx.tree.node(id);
            let html = &ctx.source.text[node.start..node.end];
            match node.kind {
                Kind::HtmlBlock if is_comment_html(html) => {}
                Kind::Heading { level: actual, .. } => {
                    if u64::from(actual) != level {
                        report.context(line, ctx.line(line), false, false);
                    }
                    return;
                }
                Kind::HtmlBlock
                    if TAG_NAME
                        .captures(html.trim_start())
                        .is_some_and(|c| HEADING_TAG.is_match(&format!("<{} ", &c[1]))) =>
                {
                    let tag = TAG_NAME
                        .captures(html.trim_start())
                        .map(|c| c[1].to_lowercase())
                        .unwrap_or_default();
                    if tag != format!("h{level}") {
                        report.context(line, ctx.line(line), false, false);
                    }
                    return;
                }
                _ if !preamble => {
                    report.context(line, ctx.line(line), false, false);
                    return;
                }
                _ => {}
            }
        }
    }
}

static HEADING_ITEM: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(?:[*+?]|\^+|[#%]{1,6}\s+\S.*)$").expect("md043"));
static PREFIXED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^([#%]{1,6})\s+(\S.*)$").expect("md043"));
static LOOP: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\^+$").expect("md043"));
static NOTHING: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(?:\*|\^+)$").expect("md043"));
const MAX_LOOPS: i64 = 1000;

fn heading_is_expected(actual: &str, expected: &str, match_case: bool) -> bool {
    if expected.starts_with('%') {
        let (Some(a), Some(e)) = (PREFIXED.captures(actual), PREFIXED.captures(expected)) else {
            return false;
        };
        let pattern = if match_case {
            e[2].to_owned()
        } else {
            format!("(?i){}", &e[2])
        };
        return a[1].len() == e[1].len()
            && super::common::cached_regex(&format!("^(?:{pattern})$"))
                .is_some_and(|re| re.is_match(&a[2]));
    }
    if match_case {
        actual == expected
    } else {
        actual.to_lowercase() == expected.to_lowercase()
    }
}

impl Rule for Md043 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let Some(required) = ctx.strings_option("headings") else {
            return;
        };
        let required: Vec<String> = required
            .into_iter()
            .map(|h| {
                if HEADING_ITEM.is_match(&h) {
                    h
                } else {
                    "[Invalid syntax]".to_owned()
                }
            })
            .collect();
        let match_case = ctx.bool_option("match_case", false);
        let mut i = 0usize;
        let mut loops = MAX_LOOPS;
        let mut fallback = false;
        let mut failed = false;
        let next = |i: &mut usize, skip: bool| -> String {
            loop {
                let expected = required
                    .get(*i)
                    .cloned()
                    .unwrap_or_else(|| "[No heading]".to_owned());
                *i += 1;
                if !(skip && LOOP.is_match(&expected)) {
                    return expected;
                }
            }
        };
        for heading in headings(ctx) {
            let actual = format!(
                "{} {}",
                "#".repeat(usize::from(heading.level)),
                heading.text
            );
            let mut expected = next(&mut i, false);
            if expected.starts_with('^') {
                let current = i;
                let following = next(&mut i, true);
                if heading_is_expected(&actual, &following, match_case) {
                    expected = following;
                } else {
                    loops -= 1;
                    let found = (0..current.saturating_sub(1))
                        .rev()
                        .find(|&j| required[j] == expected);
                    if let Some(j) = found {
                        i = j + 1;
                        expected = next(&mut i, false);
                    } else {
                        expected = following;
                    }
                }
            }
            if loops < 0 {
                report
                    .add(heading.first)
                    .detail("Too many loops")
                    .context(format!("Limit: {MAX_LOOPS}"));
                failed = true;
                break;
            } else if expected == "*" {
                let following = next(&mut i, true);
                if !heading_is_expected(&actual, &following, match_case) {
                    fallback = true;
                    i -= 1;
                }
            } else if expected == "+" {
                fallback = true;
            } else if expected == "?" {
            } else if heading_is_expected(&actual, &expected, match_case) {
                fallback = false;
            } else if fallback {
                i -= 1;
            } else {
                report.expected(heading.first, &expected, &actual);
                failed = true;
                break;
            }
        }
        let remaining: Vec<&String> = required
            .iter()
            .skip(i)
            .filter(|h| !NOTHING.is_match(h))
            .collect();
        if !failed && let Some(first) = remaining.first() {
            report.expected(ctx.source.line_count() - 1, first, "[End of file]");
        }
    }
}
