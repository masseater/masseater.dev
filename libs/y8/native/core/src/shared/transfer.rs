use crate::shared::tree::{Kind, LinkKind, Tree};

pub const HEADER_WORDS: usize = 5;
pub const NODE_WORDS: usize = 8;
const NONE: u32 = 0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum Tag {
    Document,
    Paragraph,
    Heading,
    BlockQuote,
    CodeBlock,
    HtmlBlock,
    List,
    ListItem,
    FootnoteDefinition,
    Table,
    TableHead,
    TableRow,
    TableCell,
    Emphasis,
    Strong,
    Strikethrough,
    Link,
    Image,
    Text,
    Code,
    Html,
    InlineHtml,
    SoftBreak,
    HardBreak,
    ThematicBreak,
    Math,
    MathBlock,
    FootnoteReference,
    TaskListMarker,
    Other,
}

const fn link_code(link: LinkKind) -> u32 {
    match link {
        LinkKind::Inline => 0,
        LinkKind::Reference => 1,
        LinkKind::Collapsed => 2,
        LinkKind::Shortcut => 3,
        LinkKind::Autolink => 4,
        LinkKind::Email => 5,
        LinkKind::Wiki => 6,
    }
}

#[derive(Default)]
struct Strings {
    spans: Vec<u32>,
    blob: Vec<u8>,
}

impl Strings {
    fn add(&mut self, value: &str) -> u32 {
        let index = (self.spans.len() / 2) as u32;
        self.spans.push(self.blob.len() as u32);
        self.spans.push(value.len() as u32);
        self.blob.extend_from_slice(value.as_bytes());
        index
    }
}

const fn flag(value: bool) -> u32 {
    if value { 1 } else { 0 }
}

fn fields(kind: &Kind, strings: &mut Strings) -> (Tag, u32, u32) {
    match kind {
        Kind::Document => (Tag::Document, 0, 0),
        Kind::Paragraph => (Tag::Paragraph, 0, 0),
        Kind::Heading { level, setext } => (Tag::Heading, u32::from(*level), flag(*setext)),
        Kind::BlockQuote => (Tag::BlockQuote, 0, 0),
        Kind::CodeBlock { fenced, info } => (Tag::CodeBlock, flag(*fenced), strings.add(info)),
        Kind::HtmlBlock => (Tag::HtmlBlock, 0, 0),
        Kind::List { ordered, start } => (
            Tag::List,
            flag(*ordered),
            start.map_or(NONE, |value| {
                u32::try_from(value.saturating_add(1)).unwrap_or(u32::MAX)
            }),
        ),
        Kind::ListItem => (Tag::ListItem, 0, 0),
        Kind::FootnoteDefinition { label } => (Tag::FootnoteDefinition, strings.add(label), 0),
        Kind::Table => (Tag::Table, 0, 0),
        Kind::TableHead => (Tag::TableHead, 0, 0),
        Kind::TableRow => (Tag::TableRow, 0, 0),
        Kind::TableCell => (Tag::TableCell, 0, 0),
        Kind::Emphasis => (Tag::Emphasis, 0, 0),
        Kind::Strong => (Tag::Strong, 0, 0),
        Kind::Strikethrough => (Tag::Strikethrough, 0, 0),
        Kind::Link {
            link,
            destination,
            title,
            label,
        } => (
            Tag::Link,
            link_code(*link),
            link_strings(strings, destination, title, label),
        ),
        Kind::Image {
            link,
            destination,
            title,
            label,
        } => (
            Tag::Image,
            link_code(*link),
            link_strings(strings, destination, title, label),
        ),
        Kind::Text => (Tag::Text, 0, 0),
        Kind::Code => (Tag::Code, 0, 0),
        Kind::Html => (Tag::Html, 0, 0),
        Kind::InlineHtml => (Tag::InlineHtml, 0, 0),
        Kind::SoftBreak => (Tag::SoftBreak, 0, 0),
        Kind::HardBreak => (Tag::HardBreak, 0, 0),
        Kind::ThematicBreak => (Tag::ThematicBreak, 0, 0),
        Kind::Math { display } => (Tag::Math, flag(*display), 0),
        Kind::MathBlock => (Tag::MathBlock, 0, 0),
        Kind::FootnoteReference { label } => (Tag::FootnoteReference, strings.add(label), 0),
        Kind::TaskListMarker { checked } => (Tag::TaskListMarker, flag(*checked), 0),
        Kind::Other => (Tag::Other, 0, 0),
    }
}

fn link_strings(strings: &mut Strings, destination: &str, title: &str, label: &str) -> u32 {
    let first = strings.add(destination);
    strings.add(title);
    strings.add(label);
    first
}

const fn word(value: usize) -> u32 {
    value as u32
}

fn plus_one(value: Option<u32>) -> u32 {
    value.map_or(NONE, |id| id + 1)
}

fn padded(length: usize) -> usize {
    length.div_ceil(4) * 4
}

#[must_use]
pub fn encode(tree: Option<&Tree>, text: &str, line_starts: &[usize]) -> Vec<u8> {
    let nodes = tree.map_or(&[][..], |tree| tree.nodes.as_slice());
    let mut next_sibling = vec![NONE; nodes.len()];
    for node in nodes {
        for pair in node.children.windows(2) {
            next_sibling[pair[0] as usize] = pair[1] + 1;
        }
    }
    let mut strings = Strings::default();
    let mut records = Vec::with_capacity(nodes.len() * NODE_WORDS);
    for (index, node) in nodes.iter().enumerate() {
        let (tag, first, second) = fields(&node.kind, &mut strings);
        records.extend_from_slice(&[
            tag as u32,
            word(node.start),
            word(node.end),
            plus_one(node.parent),
            plus_one(node.children.first().copied()),
            next_sibling[index],
            first,
            second,
        ]);
    }
    let header: [u32; HEADER_WORDS] = [
        word(nodes.len()),
        word(strings.spans.len() / 2),
        word(line_starts.len()),
        word(text.len()),
        word(strings.blob.len()),
    ];
    let words = header.len() + records.len() + strings.spans.len() + line_starts.len();
    let mut out = Vec::with_capacity(words * 4 + padded(text.len()) + padded(strings.blob.len()));
    let lines = line_starts.iter().map(|&start| word(start));
    for value in header
        .into_iter()
        .chain(records)
        .chain(strings.spans)
        .chain(lines)
    {
        out.extend_from_slice(&value.to_le_bytes());
    }
    out.extend_from_slice(text.as_bytes());
    out.resize(padded(out.len()), 0);
    out.extend_from_slice(&strings.blob);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::source::Source;

    fn words(bytes: &[u8]) -> Vec<u32> {
        bytes
            .as_chunks::<4>()
            .0
            .iter()
            .map(|chunk| u32::from_le_bytes(*chunk))
            .collect()
    }

    #[test]
    fn writes_nodes_with_links_to_parent_child_and_sibling() {
        let source = Source::new("# Title\n\nSee [docs](a.md \"T\").\n");
        let tree = Tree::parse(&source.text, source.body_start);
        let bytes = encode(Some(&tree), &source.text, &source.line_starts);
        let all = words(&bytes);
        assert_eq!(all[0] as usize, tree.nodes.len());
        assert_eq!(all[2] as usize, source.line_starts.len());
        assert_eq!(all[3] as usize, source.text.len());
        let node = |id: usize| &all[HEADER_WORDS + id * NODE_WORDS..][..NODE_WORDS];
        assert_eq!(node(0)[0], Tag::Document as u32);
        assert_eq!(node(0)[3], NONE);
        assert_eq!(node(1)[0], Tag::Heading as u32);
        assert_eq!((node(1)[6], node(1)[7]), (1, 0));
        assert_eq!(node(1)[5], 4);
        assert_eq!(node(0)[4], 2);
        let link = (0..tree.nodes.len())
            .find(|&id| node(id)[0] == Tag::Link as u32)
            .expect("link");
        assert_eq!(node(link)[6], 0);
    }

    #[test]
    fn writes_text_only_without_a_tree() {
        let source = Source::new("plain\n");
        let bytes = encode(None, &source.text, &source.line_starts);
        let all = words(&bytes);
        assert_eq!(&all[..HEADER_WORDS], &[0, 0, 2, 6, 0]);
        assert_eq!(&bytes[(HEADER_WORDS + 2) * 4..][..6], b"plain\n");
    }
}
