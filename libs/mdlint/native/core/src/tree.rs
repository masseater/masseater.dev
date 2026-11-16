use std::ops::Range;

use pulldown_cmark::{CodeBlockKind, Event, HeadingLevel, LinkType, Options, Parser, Tag};
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LinkKind {
    Inline,
    Reference,
    Collapsed,
    Shortcut,
    Autolink,
    Email,
    Wiki,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Kind {
    Document,
    Paragraph,
    Heading {
        level: u8,
        setext: bool,
    },
    BlockQuote,
    CodeBlock {
        fenced: bool,
        info: String,
    },
    HtmlBlock,
    List {
        ordered: bool,
        start: Option<u64>,
    },
    ListItem,
    FootnoteDefinition {
        label: String,
    },
    Table,
    TableHead,
    TableRow,
    TableCell,
    Emphasis,
    Strong,
    Strikethrough,
    Link {
        link: LinkKind,
        destination: String,
        title: String,
        label: String,
    },
    Image {
        link: LinkKind,
        destination: String,
        title: String,
        label: String,
    },
    Text,
    Code,
    Html,
    InlineHtml,
    SoftBreak,
    HardBreak,
    ThematicBreak,
    Math {
        display: bool,
    },
    MathBlock,
    FootnoteReference {
        label: String,
    },
    TaskListMarker {
        checked: bool,
    },
    Other,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub kind: Kind,
    pub start: usize,
    pub end: usize,
    pub parent: Option<u32>,
    pub children: Vec<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Definition {
    pub label: String,
    pub destination: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tree {
    pub nodes: Vec<Node>,
    pub definitions: Vec<Definition>,
    pub math_blocks: Vec<(usize, usize)>,
    pub undefined_references: Vec<UndefinedReference>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UndefinedReference {
    pub label: String,
    pub link: LinkKind,
    pub start: usize,
    pub end: usize,
}

#[must_use]
pub fn options() -> Options {
    Options::ENABLE_TABLES
        | Options::ENABLE_FOOTNOTES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_GFM
        | Options::ENABLE_MATH
}

fn link_kind(link: LinkType) -> LinkKind {
    match link {
        LinkType::Inline => LinkKind::Inline,
        LinkType::Reference | LinkType::ReferenceUnknown => LinkKind::Reference,
        LinkType::Collapsed | LinkType::CollapsedUnknown => LinkKind::Collapsed,
        LinkType::Shortcut | LinkType::ShortcutUnknown => LinkKind::Shortcut,
        LinkType::Autolink => LinkKind::Autolink,
        LinkType::Email => LinkKind::Email,
        LinkType::WikiLink { .. } => LinkKind::Wiki,
    }
}

fn level(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

fn container(tag: Tag<'_>, text: &str, range: &Range<usize>) -> Kind {
    match tag {
        Tag::Paragraph => Kind::Paragraph,
        Tag::Heading { level: l, .. } => Kind::Heading {
            level: level(l),
            setext: !text[range.start..].trim_start().starts_with('#'),
        },
        Tag::BlockQuote(_) => Kind::BlockQuote,
        Tag::CodeBlock(CodeBlockKind::Fenced(info)) => Kind::CodeBlock {
            fenced: true,
            info: info.into_string(),
        },
        Tag::CodeBlock(CodeBlockKind::Indented) => Kind::CodeBlock {
            fenced: false,
            info: String::new(),
        },
        Tag::HtmlBlock => Kind::HtmlBlock,
        Tag::List(start) => Kind::List {
            ordered: start.is_some(),
            start,
        },
        Tag::Item => Kind::ListItem,
        Tag::FootnoteDefinition(label) => Kind::FootnoteDefinition {
            label: label.into_string(),
        },
        Tag::Table(_) => Kind::Table,
        Tag::TableHead => Kind::TableHead,
        Tag::TableRow => Kind::TableRow,
        Tag::TableCell => Kind::TableCell,
        Tag::Emphasis => Kind::Emphasis,
        Tag::Strong => Kind::Strong,
        Tag::Strikethrough => Kind::Strikethrough,
        Tag::Link {
            link_type,
            dest_url,
            title,
            id,
        } => Kind::Link {
            link: link_kind(link_type),
            destination: dest_url.into_string(),
            title: title.into_string(),
            label: id.into_string(),
        },
        Tag::Image {
            link_type,
            dest_url,
            title,
            id,
        } => Kind::Image {
            link: link_kind(link_type),
            destination: dest_url.into_string(),
            title: title.into_string(),
            label: id.into_string(),
        },
        _ => Kind::Other,
    }
}

fn leaf_kind(event: Event<'_>) -> Kind {
    match event {
        Event::Text(_) => Kind::Text,
        Event::Code(_) => Kind::Code,
        Event::Html(_) => Kind::Html,
        Event::InlineHtml(_) => Kind::InlineHtml,
        Event::SoftBreak => Kind::SoftBreak,
        Event::HardBreak => Kind::HardBreak,
        Event::Rule => Kind::ThematicBreak,
        Event::FootnoteReference(label) => Kind::FootnoteReference {
            label: label.into_string(),
        },
        Event::InlineMath(_) => Kind::Math { display: false },
        Event::DisplayMath(_) => Kind::Math { display: true },
        Event::TaskListMarker(checked) => Kind::TaskListMarker { checked },
        _ => Kind::Other,
    }
}

fn undefined_reference(
    link: &pulldown_cmark::BrokenLink<'_>,
    body: &str,
    base: usize,
) -> Option<UndefinedReference> {
    if matches!(link.link_type, LinkType::Reference) && !body[link.span.clone()].contains("][") {
        return None;
    }
    Some(UndefinedReference {
        label: link.reference.to_string(),
        link: link_kind(link.link_type),
        start: link.span.start + base,
        end: link.span.end
            + base
            + if matches!(
                link.link_type,
                LinkType::Collapsed | LinkType::CollapsedUnknown
            ) && body[link.span.end..].starts_with("[]")
            {
                2
            } else {
                0
            },
    })
}

fn extend_collapsed(nodes: &mut [Node], text: &str) {
    for node in nodes {
        if let Kind::Link {
            link: LinkKind::Collapsed,
            ..
        }
        | Kind::Image {
            link: LinkKind::Collapsed,
            ..
        } = node.kind
            && text[node.end..].starts_with("[]")
        {
            node.end += 2;
        }
    }
}

impl Tree {
    #[must_use]
    pub fn parse(text: &str, base: usize) -> Self {
        let original = &text[base..];
        let (masked, math_blocks) = mask_math_flows(original);
        let body = masked.as_str();
        let broken = std::cell::RefCell::new(Vec::new());
        let mut callback = |link: pulldown_cmark::BrokenLink<'_>| {
            if let Some(reference) = undefined_reference(&link, body, base) {
                broken.borrow_mut().push(reference);
            }
            None
        };
        let parser = Parser::new_with_broken_link_callback(body, options(), Some(&mut callback));
        let definitions = parser
            .reference_definitions()
            .iter()
            .map(|(label, def)| Definition {
                label: label.to_owned(),
                destination: def.dest.to_string(),
                start: def.span.start + base,
                end: def.span.end + base,
            })
            .collect();
        let mut nodes = vec![Node {
            kind: Kind::Document,
            start: base,
            end: text.len(),
            parent: None,
            children: Vec::new(),
        }];
        let mut stack: Vec<u32> = vec![0];
        let push = |nodes: &mut Vec<Node>, stack: &[u32], kind: Kind, range: Range<usize>| {
            let parent = *stack.last().expect("root");
            let id = nodes.len() as u32;
            nodes.push(Node {
                kind,
                start: range.start + base,
                end: range.end + base,
                parent: Some(parent),
                children: Vec::new(),
            });
            nodes[parent as usize].children.push(id);
            id
        };
        let mut skipped = 0usize;
        for (event, range) in parser.into_offset_iter() {
            let in_math = math_blocks
                .iter()
                .any(|&(s, e)| range.start >= s && range.start < e);
            match (&event, skipped > 0 || in_math) {
                (Event::Start(_), true) => {
                    skipped += 1;
                    continue;
                }
                (Event::End(_), _) if skipped > 0 => {
                    skipped -= 1;
                    continue;
                }
                (_, true) => continue,
                _ => {}
            }
            match event {
                Event::Start(tag) => {
                    let kind = container(tag, body, &range);
                    let id = push(&mut nodes, &stack, kind, range);
                    stack.push(id);
                }
                Event::End(_) => {
                    stack.pop();
                }
                leaf => {
                    push(&mut nodes, &stack, leaf_kind(leaf), range);
                }
            }
        }
        extend_collapsed(&mut nodes, text);
        let undefined_references = broken.into_inner();
        Self {
            nodes,
            definitions,
            math_blocks: math_blocks
                .into_iter()
                .map(|(s, e)| (s + base, e + base))
                .collect(),
            undefined_references,
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = (u32, &Node)> {
        self.nodes.iter().enumerate().map(|(i, n)| (i as u32, n))
    }

    #[must_use]
    pub fn node(&self, id: u32) -> &Node {
        &self.nodes[id as usize]
    }

    pub fn ancestors(&self, id: u32) -> impl Iterator<Item = (u32, &Node)> {
        std::iter::successors(self.node(id).parent, |&p| self.node(p).parent)
            .map(|p| (p, self.node(p)))
    }

    pub fn descendants(&self, id: u32) -> impl Iterator<Item = (u32, &Node)> {
        let mut stack: Vec<u32> = self.node(id).children.iter().rev().copied().collect();
        std::iter::from_fn(move || {
            let next = stack.pop()?;
            stack.extend(self.node(next).children.iter().rev());
            Some((next, self.node(next)))
        })
    }

    #[must_use]
    pub fn inside(&self, id: u32, matches: impl Fn(&Kind) -> bool) -> bool {
        self.ancestors(id).any(|(_, n)| matches(&n.kind))
    }
}

fn strip_container(line: &str) -> &str {
    line.trim_start_matches([' ', '>'])
}

fn fence_of(line: &str) -> Option<(char, usize)> {
    let trimmed = strip_container(line);
    let first = trimmed.chars().next()?;
    if first != '`' && first != '~' {
        return None;
    }
    let count = trimmed.len() - trimmed.trim_start_matches(first).len();
    (count >= 3).then_some((first, count))
}

fn mask_math_flows(body: &str) -> (String, Vec<(usize, usize)>) {
    if !body.contains("$$") {
        return (body.to_owned(), Vec::new());
    }
    let mut masked = body.as_bytes().to_vec();
    let mut blocks = Vec::new();
    let mut fence: Option<(char, usize)> = None;
    let mut math: Option<usize> = None;
    let mut offset = 0;
    for line in body.split_inclusive('\n') {
        let content = line.trim_end_matches('\n');
        let stripped = strip_container(content);
        if let Some(start) = math {
            if stripped.trim_end().starts_with("$$")
                && stripped.trim_end().trim_start_matches('$').is_empty()
            {
                blocks.push((start, offset + content.len()));
                math = None;
            } else {
                let prefix = content.len() - stripped.len();
                for byte in &mut masked[offset + prefix..offset + content.len()] {
                    if !byte.is_ascii_whitespace() {
                        *byte = b'x';
                    }
                }
            }
        } else if let Some((ch, len)) = fence {
            if fence_of(content).is_some_and(|(c, l)| {
                c == ch
                    && l >= len
                    && strip_container(content)
                        .trim_start_matches(c)
                        .trim()
                        .is_empty()
            }) {
                fence = None;
            }
        } else if let Some(found) = fence_of(content) {
            fence = Some(found);
        } else if stripped.starts_with("$$")
            && content.len() - stripped.len() <= 3 + content.matches('>').count() * 2
        {
            let rest = stripped.trim_start_matches('$');
            if !rest.contains('$') {
                math = Some(offset);
            }
        }
        offset += line.len();
    }
    if let Some(start) = math {
        blocks.push((start, body.len()));
    }
    let masked = String::from_utf8(masked).unwrap_or_else(|_| body.to_owned());
    (masked, blocks)
}
