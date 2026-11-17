use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::LazyLock;

use regex::Regex;

use super::common::headings;
use super::common::{definition_lines, inline_math_spans, text_segments};
use super::headings::is_docfx_tab;
use super::headings::rule;
use super::inline::{html_tags, label_range};
use crate::features::check_markdown::rule::{Context, Report, Rule, RuleMeta, ellipsify};
use crate::shared::source::utf16_len;
use crate::shared::tree::{Kind, LinkKind};

rule!(
    Md052,
    ["MD052", "reference-links-images"],
    "Reference links and images should use a label that is defined",
    ["images", "links"]
);
rule!(
    Md053,
    ["MD053", "link-image-reference-definitions"],
    "Link and image reference definitions should be needed",
    ["images", "links"]
);

#[must_use]
pub fn normalize_label(text: &str) -> String {
    text.to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub struct Usage {
    pub start: usize,
    pub end: usize,
}

#[derive(Default)]
pub struct ReferenceData {
    pub references: HashMap<String, Vec<Usage>>,
    pub shortcuts: HashMap<String, Vec<Usage>>,
    pub definitions: HashMap<String, (usize, String)>,
    pub definition_order: Vec<String>,
    pub duplicates: Vec<(String, usize)>,
}

static FOOTNOTE_CALL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[\^([^\]\s]+)\]").expect("footnote call"));
static DEFINITION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^ {0,3}\[([^\]]*[^\\])\]:").expect("definition"));

#[must_use]
pub fn reference_data<'c>(ctx: &Context<'c>) -> &'c ReferenceData {
    ctx.cache
        .references
        .get_or_init(|| compute_reference_data(ctx))
}

impl ReferenceData {
    fn add(&mut self, shortcut: bool, label: &str, start: usize, end: usize) {
        let map = if shortcut {
            &mut self.shortcuts
        } else {
            &mut self.references
        };
        map.entry(normalize_label(label))
            .or_default()
            .push(Usage { start, end });
    }
}

fn compute_reference_data(ctx: &Context<'_>) -> ReferenceData {
    let mut data = ReferenceData::default();
    collect_usages(ctx, &mut data);
    collect_undefined(ctx, &mut data);
    collect_definitions(ctx, &mut data);
    data
}

fn collect_usages(ctx: &Context<'_>, data: &mut ReferenceData) {
    let mut add = |shortcut: bool, label: &str, start: usize, end: usize| {
        data.add(shortcut, label, start, end);
    };
    for (_, node) in ctx.tree.iter() {
        match &node.kind {
            Kind::Link { link, label, .. } | Kind::Image { link, label, .. } => match link {
                LinkKind::Reference | LinkKind::Collapsed => {
                    add(false, label, node.start, node.end);
                }
                LinkKind::Shortcut => add(true, label, node.start, node.end),
                _ => {}
            },
            Kind::FootnoteReference { label } => {
                add(true, &format!("^{label}"), node.start, node.end);
            }
            Kind::TaskListMarker { checked: true } => add(
                true,
                ctx.source.text[node.start..node.end].trim_matches(['[', ']']),
                node.start,
                node.end,
            ),
            _ => {}
        }
    }
    for &(_, start, end) in text_segments(ctx) {
        let text = &ctx.source.text[start..end];
        for caps in FOOTNOTE_CALL.captures_iter(text) {
            let found = caps.get(0).expect("match");
            if found.start() > 0 && text.as_bytes()[found.start() - 1] == b'\\' {
                continue;
            }
            add(
                true,
                &format!("^{}", &caps[1]),
                start + found.start(),
                start + found.end(),
            );
        }
    }
}

fn collect_undefined(ctx: &Context<'_>, data: &mut ReferenceData) {
    let mut add = |shortcut: bool, label: &str, start: usize, end: usize| {
        data.add(shortcut, label, start, end);
    };
    for reference in &ctx.tree.undefined_references {
        let (start, end) = (reference.start, reference.end);
        let span = &ctx.source.text[start..end];
        let open = start + usize::from(span.starts_with('!'));
        let Some(split) = trailing_label(span).map(|s| start + s) else {
            continue;
        };
        let first_end = if split > open { split } else { end };
        let first = valid_label_text(ctx, open + 1, first_end.saturating_sub(1));
        match reference.link {
            LinkKind::Shortcut => {
                if let Some(text) = first {
                    add(true, &text, start, end);
                }
            }
            LinkKind::Collapsed => {
                if let Some(text) = valid_label_text(ctx, open + 1, end.saturating_sub(3)) {
                    add(false, &text, start, end);
                }
            }
            _ => {
                let second = valid_label_text(ctx, split + 1, end - 1);
                match (first, second) {
                    (Some(_), Some(text)) => add(false, &text, start, end),
                    (None, Some(text)) => add(true, &text, split, end),
                    _ => {}
                }
            }
        }
    }
}

fn collect_definitions(ctx: &Context<'_>, data: &mut ReferenceData) {
    let mut definitions: Vec<(usize, String, String)> = ctx
        .tree
        .definitions
        .iter()
        .map(|d| {
            (
                ctx.source.line_of(d.start),
                normalize_label(&d.label),
                d.destination.clone(),
            )
        })
        .collect();
    for (_, node) in ctx.tree.iter() {
        if let Kind::FootnoteDefinition { label } = &node.kind {
            definitions.push((
                ctx.source.line_of(node.start),
                normalize_label(&format!("^{label}")),
                String::new(),
            ));
        }
    }
    let known: std::collections::HashSet<usize> = definitions.iter().map(|d| d.0).collect();
    let mut lines: Vec<usize> = definition_lines(ctx)
        .iter()
        .copied()
        .filter(|l| !known.contains(l))
        .collect();
    lines.sort_unstable();
    for line in lines {
        let text = ctx.source.line(line).trim_start_matches(['>', ' ', '\t']);
        if let Some(caps) = DEFINITION.captures(text) {
            definitions.push((line, normalize_label(&caps[1]), String::new()));
        }
    }
    definitions.sort_by_key(|d| d.0);
    for (line, label, destination) in definitions {
        if data.definitions.contains_key(&label) {
            data.duplicates.push((label, line));
        } else {
            data.definition_order.push(label.clone());
            data.definitions.insert(label, (line, destination));
        }
    }
}

impl Rule for Md052 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let shortcut_syntax = ctx.bool_option("shortcut_syntax", false);
        let ignored = ctx
            .strings_option("ignored_labels")
            .unwrap_or_else(|| vec!["x".to_owned()]);
        let data = reference_data(ctx);
        let mut entries: Vec<(&String, &Vec<Usage>)> = data.references.iter().collect();
        if shortcut_syntax {
            entries.extend(data.shortcuts.iter());
        }
        for (label, usages) in entries {
            if data.definitions.contains_key(label) || ignored.contains(label) {
                continue;
            }
            for usage in usages {
                let line = ctx.source.line_of(usage.start);
                let line_end = ctx.source.line_range(line).1;
                let context = &ctx.source.text[usage.start..usage.end.min(line_end)];
                report
                    .add(line)
                    .detail(format!(
                        "Missing link or image reference definition: \"{label}\""
                    ))
                    .context(context)
                    .range(ctx.source.column_of(usage.start), utf16_len(context));
            }
        }
    }
}

impl Rule for Md053 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ignored = ctx
            .strings_option("ignored_definitions")
            .unwrap_or_else(|| vec!["//".to_owned()]);
        let data = reference_data(ctx);
        let mut emit = |line: usize, detail: String| {
            let text = ctx.source.line(line);
            report
                .add(line)
                .detail(detail)
                .context(ellipsify(text, false, false))
                .range(1, utf16_len(text));
        };
        for label in &data.definition_order {
            if ignored.contains(label)
                || data.references.contains_key(label)
                || data.shortcuts.contains_key(label)
            {
                continue;
            }
            emit(
                data.definitions[label].0,
                format!("Unused link or image reference definition: \"{label}\""),
            );
        }
        for (label, line) in &data.duplicates {
            if !ignored.contains(label) {
                emit(
                    *line,
                    format!("Duplicate link or image reference definition: \"{label}\""),
                );
            }
        }
    }
}

rule!(
    Md054,
    ["MD054", "link-image-style"],
    "Link and image style",
    ["images", "links"]
);
rule!(
    Md059,
    ["MD059", "descriptive-link-text"],
    "Link text should be descriptive",
    ["accessibility", "links"]
);

fn autolink_able(destination: &str) -> bool {
    static SCHEME: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"^([A-Za-z][A-Za-z0-9+.-]*):(.*)$").expect("scheme"));
    let Some(caps) = SCHEME.captures(destination) else {
        return false;
    };
    let special =
        ["http", "https", "ws", "wss", "ftp", "file"].contains(&caps[1].to_lowercase().as_str());
    if special
        && caps[1].to_lowercase() != "file"
        && caps[2].trim_start_matches(['/', '\\']).is_empty()
    {
        return false;
    }
    !destination.contains([' ', '<', '>'])
}

fn resource(text: &str) -> Option<(&str, bool)> {
    let inner = text.strip_suffix(')')?;
    let inner = inner.trim_start_matches([' ', '\t', '\n']);
    let (destination, rest) = if let Some(stripped) = inner.strip_prefix('<') {
        let close = stripped.find('>')?;
        (&stripped[..close], &stripped[close + 1..])
    } else {
        let mut depth = 0i32;
        let mut end = inner.len();
        let bytes = inner.as_bytes();
        let mut i = 0;
        while i < bytes.len() {
            match bytes[i] {
                b'\\' => i += 1,
                b'(' => depth += 1,
                b')' if depth > 0 => depth -= 1,
                b' ' | b'\t' | b'\n' => {
                    end = i;
                    break;
                }
                _ => {}
            }
            i += 1;
        }
        (&inner[..end], &inner[end..])
    };
    Some((destination, !rest.trim().is_empty()))
}

impl Rule for Md054 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let autolink = ctx.bool_option("autolink", true);
        let inline = ctx.bool_option("inline", true);
        let full = ctx.bool_option("full", true);
        let collapsed = ctx.bool_option("collapsed", true);
        let shortcut = ctx.bool_option("shortcut", true);
        let url_inline = ctx.bool_option("url_inline", true);
        if autolink && inline && full && collapsed && shortcut && url_inline {
            return;
        }
        for (_, node) in ctx.tree.iter() {
            let (link, destination, image) = match &node.kind {
                Kind::Link {
                    link, destination, ..
                } => (link, destination, false),
                Kind::Image {
                    link, destination, ..
                } => (link, destination, true),
                _ => continue,
            };
            let error = match link {
                LinkKind::Autolink | LinkKind::Email => !autolink && !destination.is_empty(),
                LinkKind::Inline => {
                    let Some((label_start, label_end)) = label_range(ctx, node.start, node.end)
                    else {
                        continue;
                    };
                    let label = &ctx.source.text[label_start..label_end];
                    let Some((raw, titled)) = ctx.source.text[label_end + 1..node.end]
                        .strip_prefix('(')
                        .and_then(resource)
                    else {
                        continue;
                    };
                    !raw.is_empty()
                        && (!inline
                            || (!url_inline
                                && autolink
                                && !image
                                && !titled
                                && label == raw
                                && autolink_able(raw)))
                }
                LinkKind::Reference => !destination.is_empty() && !full,
                LinkKind::Collapsed => !destination.is_empty() && !collapsed,
                LinkKind::Shortcut => !destination.is_empty() && !shortcut,
                LinkKind::Wiki => false,
            };
            if !error {
                continue;
            }
            let text = &ctx.source.text[node.start..node.end];
            let first_line = text.split(['\n', '\r']).next().unwrap_or("");
            let finding = report.context(ctx.source.line_of(node.start), first_line, false, false);
            if first_line.len() == text.len() {
                finding.range(ctx.source.column_of(node.start), utf16_len(text));
            }
        }
    }
}

fn normalize_text(text: &str) -> String {
    text.split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

impl Rule for Md059 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let prohibited: Vec<String> = ctx
            .strings_option("prohibited_texts")
            .unwrap_or_else(|| {
                ["click here", "here", "link", "more"]
                    .map(str::to_owned)
                    .to_vec()
            })
            .iter()
            .map(|t| normalize_text(t))
            .collect();
        if prohibited.is_empty() {
            return;
        }
        let math: Vec<(usize, usize)> = inline_math_spans(ctx)
            .iter()
            .copied()
            .filter(|&(s, _)| ctx.source.text.as_bytes()[s] == b'$')
            .collect();
        for (_, node) in ctx.tree.iter() {
            let Kind::Link { link, .. } = &node.kind else {
                continue;
            };
            if math.iter().any(|&(s, e)| node.start >= s && node.start < e) {
                continue;
            }
            if matches!(link, LinkKind::Autolink | LinkKind::Email | LinkKind::Wiki) {
                continue;
            }
            if node
                .children
                .iter()
                .any(|&c| matches!(ctx.tree.node(c).kind, Kind::Code | Kind::InlineHtml))
            {
                continue;
            }
            let Some((start, end)) = label_range(ctx, node.start, node.end) else {
                continue;
            };
            let text = &ctx.source.text[start..end];
            if !prohibited.contains(&normalize_text(text)) {
                continue;
            }
            let finding = report.context(
                ctx.source.line_of(start),
                &ctx.source.text[start - 1..=end].replace('\n', " "),
                false,
                false,
            );
            if !text.contains('\n') {
                finding.range(ctx.source.column_of(start), utf16_len(text));
            }
        }
    }
}

rule!(
    Md051,
    ["MD051", "link-fragments"],
    "Link fragments should be valid",
    ["links"]
);

static ANCHOR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{(#[a-z\d]+(?:[-_]+[a-z\d]+)*)\}").expect("anchor"));
static LINE_FRAGMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^#(?:L\d+(?:C\d+)?-L\d+(?:C\d+)?|L\d+)$").expect("line fragment")
});
static ID_ATTRIBUTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)\sid\s*=\s*['"]?([^'"\s>]*)"#).expect("id"));
static NAME_ATTRIBUTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)\sname\s*=\s*['"]?([^'"\s>]*)"#).expect("name"));
static ESCAPE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r##"\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])"##).expect("escape")
});

fn encode_uri_component(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            out.push(byte as char);
        } else {
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}

fn heading_inline_text(ctx: &Context<'_>, id: u32, out: &mut String) {
    for &child in &ctx.tree.node(id).children {
        let node = ctx.tree.node(child);
        match node.kind {
            Kind::Text => out.push_str(&unescape(&ctx.source.text[node.start..node.end])),
            Kind::Code | Kind::Math { .. } => {
                let raw = &ctx.source.text[node.start..node.end];
                let marker = raw.chars().next().unwrap_or('`');
                let ticks = raw.len() - raw.trim_start_matches(marker).len();
                let inner = &raw[ticks..raw.len().saturating_sub(ticks).max(ticks)];
                out.push_str(inner);
            }
            Kind::Image { .. } | Kind::InlineHtml => {}
            _ => heading_inline_text(ctx, child, out),
        }
    }
}

fn unescape(text: &str) -> String {
    ESCAPE.replace_all(text, "$1").into_owned()
}

static NOT_FRAGMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[^\p{L}\p{M}\p{N}\p{Pc}\- ]").expect("fragment"));

fn heading_fragment(text: &str) -> String {
    let kept = NOT_FRAGMENT
        .replace_all(&text.to_lowercase(), "")
        .replace(' ', "-");
    format!("#{}", encode_uri_component(&kept))
}

fn known_fragments(ctx: &Context<'_>) -> (Vec<(String, usize)>, Vec<u32>) {
    let mut fragments: Vec<(String, usize)> = vec![("#top".to_owned(), 0)];
    let set = |fragments: &mut Vec<(String, usize)>, key: String, value: usize| {
        if let Some(entry) = fragments.iter_mut().find(|(k, _)| *k == key) {
            entry.1 = value;
        } else {
            fragments.push((key, value));
        }
    };
    let mut docfx = Vec::new();
    for heading in headings(ctx) {
        if is_docfx_tab(ctx, heading) {
            docfx.push(heading.id);
        }
        let mut text = String::new();
        heading_inline_text(ctx, heading.id, &mut text);
        let fragment = heading_fragment(&text);
        if fragment == "#" {
            continue;
        }
        let count = fragments
            .iter()
            .find(|(k, _)| *k == fragment)
            .map_or(0, |e| e.1);
        if count > 0 {
            set(&mut fragments, format!("{fragment}-{count}"), 0);
        }
        set(&mut fragments, fragment, count + 1);
        let node = ctx.tree.node(heading.id);
        let (_, line_end) = ctx.source.line_range(heading.last);
        for caps in ANCHOR
            .captures_iter(&ctx.source.text[node.start..line_end.min(node.end.max(node.start))])
        {
            if !fragments.iter().any(|(k, _)| k == &caps[1]) {
                fragments.push((caps[1].to_owned(), 1));
            }
        }
    }
    for tag in html_tags(ctx) {
        if tag.close {
            continue;
        }
        let found = ID_ATTRIBUTE.captures(tag.text).or_else(|| {
            tag.name
                .eq_ignore_ascii_case("a")
                .then(|| NAME_ATTRIBUTE.captures(tag.text))
                .flatten()
        });
        if let Some(caps) = found {
            set(&mut fragments, format!("#{}", &caps[1]), 0);
        }
    }
    (fragments, docfx)
}

fn fragment_targets(ctx: &Context<'_>, docfx: &[u32]) -> Vec<(usize, usize, String)> {
    let math: Vec<(usize, usize)> = inline_math_spans(ctx)
        .iter()
        .copied()
        .filter(|&(s, _)| ctx.source.text.as_bytes()[s] == b'$')
        .collect();
    let mut targets: Vec<(usize, usize, String)> = Vec::new();
    for (_, node) in ctx.tree.iter() {
        let Kind::Link {
            link: LinkKind::Inline,
            ..
        } = node.kind
        else {
            continue;
        };
        if node.parent.is_some_and(|p| docfx.contains(&p))
            || math.iter().any(|&(s, e)| node.start >= s && node.start < e)
        {
            continue;
        }
        let Some((_, label_end)) = label_range(ctx, node.start, node.end) else {
            continue;
        };
        let Some((raw, _)) = ctx.source.text[label_end + 1..node.end]
            .strip_prefix('(')
            .and_then(resource)
        else {
            continue;
        };
        targets.push((node.start, node.end, unescape(raw)));
    }
    for definition in &ctx.tree.definitions {
        let raw = &ctx.source.text[definition.start..definition.end];
        let Some(colon) = raw.find("]:") else {
            continue;
        };
        let rest = raw[colon + 2..].trim_start();
        let destination = rest.strip_prefix('<').map_or_else(
            || rest.split_whitespace().next().unwrap_or(""),
            |inner| inner.split('>').next().unwrap_or(""),
        );
        targets.push((
            definition.start,
            definition.start + raw.trim_end().len(),
            unescape(destination),
        ));
    }
    targets.sort_by_key(|t| t.0);
    targets
}

impl Rule for Md051 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let ignore_case = ctx.bool_option("ignore_case", false);
        let ignored_pattern = ctx
            .option("ignored_pattern")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("");
        let ignored = super::common::cached_regex(if ignored_pattern.is_empty() {
            "^$"
        } else {
            ignored_pattern
        });
        let (fragments, docfx) = known_fragments(ctx);
        let targets = fragment_targets(ctx, &docfx);
        for (start, end, text) in targets {
            if text.len() <= 1 || !text.starts_with('#') {
                continue;
            }
            let encoded = format!("#{}", encode_uri_component(&text[1..]));
            if fragments.iter().any(|(k, _)| *k == encoded)
                || LINE_FRAGMENT.is_match(&encoded)
                || ignored.as_ref().is_some_and(|re| re.is_match(&text[1..]))
            {
                continue;
            }
            let line = ctx.source.line_of(start);
            let single = ctx.source.line_of(end.saturating_sub(1).max(start)) == line;
            let lower = text.to_lowercase();
            let mixed = fragments
                .iter()
                .find(|(k, _)| k.to_lowercase() == lower)
                .map(|(k, _)| k.clone());
            let finding = match mixed {
                Some(key) if ignore_case || key == text => continue,
                Some(key) => report
                    .add(line)
                    .detail(format!("Expected: {key}; Actual: {text}")),
                None => report.add(line),
            };
            if single {
                let context = &ctx.source.text[start..end];
                finding
                    .context(context)
                    .range(ctx.source.column_of(start), utf16_len(context));
            }
        }
    }
}

fn trailing_label(span: &str) -> Option<usize> {
    if !span.ends_with(']') {
        return None;
    }
    let bytes = span.as_bytes();
    let mut depth = 0i32;
    let mut index = bytes.len();
    while index > 0 {
        index -= 1;
        let escaped = index > 0 && bytes[index - 1] == b'\\';
        match bytes[index] {
            b']' if !escaped => depth += 1,
            b'[' if !escaped => {
                depth -= 1;
                if depth == 0 {
                    return Some(index);
                }
            }
            _ => {}
        }
    }
    None
}

static ENTITY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);").expect("entity")
});

fn valid_label_text(ctx: &Context<'_>, start: usize, end: usize) -> Option<String> {
    let mut text = String::new();
    for (_, node) in ctx.tree.iter() {
        if node.start < start || node.end > end {
            continue;
        }
        if matches!(node.kind, Kind::SoftBreak | Kind::HardBreak) {
            text.push('\n');
            continue;
        }
        if !matches!(node.kind, Kind::Text) {
            continue;
        }
        let mut slice = &ctx.source.text[node.start..node.end];
        if node.start > 0 && ctx.source.text.as_bytes()[node.start - 1] == b'\\' {
            slice = slice
                .get(slice.chars().next().map_or(0, char::len_utf8)..)
                .unwrap_or("");
        }
        text.push_str(&ENTITY.replace_all(slice, ""));
    }
    let text = text.trim();
    (!text.is_empty() && !text.contains(']')).then(|| text.to_owned())
}
