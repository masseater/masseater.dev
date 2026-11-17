use std::borrow::Cow;
use std::collections::HashMap;
use std::rc::Rc;

use saphyr_parser::{Event, Parser, ScalarStyle, Span, Tag};

use super::resolve::resolve;
use super::{Kind, Node, Pos, Style};

#[derive(Debug, Clone)]
pub struct LoadError {
    pub pos: Pos,
    pub message: String,
}

pub struct Loaded {
    pub root: Option<Rc<Node>>,
    pub errors: Vec<LoadError>,
}

struct Anchor {
    name: String,
    pos: Pos,
    node: Option<Rc<Node>>,
    used: bool,
}

struct Frame {
    kind: Kind,
    tag: String,
    pos: Pos,
    anchor: usize,
    content: Vec<Rc<Node>>,
}

struct Source {
    chars: Vec<char>,
}

impl Source {
    fn token_at(&self, index: usize) -> String {
        self.chars[index..]
            .iter()
            .skip(1)
            .take_while(|c| !c.is_whitespace() && !matches!(c, ',' | '[' | ']' | '{' | '}'))
            .collect()
    }

    fn anchor_name(&self, start: usize) -> String {
        let mut index = start;
        while index < self.chars.len() {
            match self.chars[index] {
                '&' => return self.token_at(index),
                '!' => {
                    while index < self.chars.len() && !self.chars[index].is_whitespace() {
                        index += 1;
                    }
                    while index < self.chars.len() && matches!(self.chars[index], ' ' | '\t') {
                        index += 1;
                    }
                }
                _ => break,
            }
        }
        String::new()
    }

    fn line_start(&self, index: usize) -> usize {
        self.chars[..index]
            .iter()
            .rposition(|c| *c == '\n')
            .map_or(0, |at| at + 1)
    }

    fn position(&self, index: usize) -> Pos {
        let line = self.chars[..index].iter().filter(|c| **c == '\n').count() + 1;
        Pos::new(line, index - self.line_start(index) + 1)
    }

    fn block_header(&self, content_start: usize) -> Option<usize> {
        let mut index = content_start.min(self.chars.len());
        loop {
            index = self.chars[..index].iter().rposition(|c| *c == '\n')?;
            let start = self.line_start(index);
            let line: String = self.chars[start..index].iter().collect();
            let code = strip_comment(&line);
            let trimmed = code
                .trim_end()
                .trim_end_matches(|c: char| c == '-' || c == '+' || c.is_ascii_digit());
            if let Some(last) = trimmed.chars().last()
                && matches!(last, '|' | '>')
            {
                let mut at = start + trimmed.chars().count() - 1;
                loop {
                    let before = self.chars[start..at]
                        .iter()
                        .rposition(|c| !matches!(c, ' ' | '\t'))
                        .map(|offset| start + offset);
                    let Some(end) = before else { break };
                    let token_start = self.chars[start..=end]
                        .iter()
                        .rposition(|c| matches!(c, ' ' | '\t'))
                        .map_or(start, |offset| start + offset + 1);
                    if matches!(self.chars[token_start], '&' | '!') {
                        at = token_start;
                    } else {
                        break;
                    }
                }
                return Some(at);
            }
            if !code.trim().is_empty() {
                return None;
            }
        }
    }
}

fn strip_comment(line: &str) -> &str {
    let mut previous = ' ';
    for (index, character) in line.char_indices() {
        if character == '#' && (previous == ' ' || previous == '\t') {
            return &line[..index];
        }
        previous = character;
    }
    line
}

fn short_tag(tag: &Tag) -> String {
    if tag.handle == "tag:yaml.org,2002:" {
        return format!("!!{}", tag.suffix);
    }
    if tag.handle == "!!" {
        return format!("!!{}", tag.suffix);
    }
    format!("{}{}", tag.handle, tag.suffix)
}

fn style_of(style: ScalarStyle) -> Style {
    match style {
        ScalarStyle::SingleQuoted => Style::SingleQuoted,
        ScalarStyle::DoubleQuoted => Style::DoubleQuoted,
        ScalarStyle::Literal => Style::Literal,
        ScalarStyle::Folded => Style::Folded,
        ScalarStyle::Plain => Style::Plain,
    }
}

struct Builder {
    source: Source,
    anchors: HashMap<usize, Anchor>,
    stack: Vec<Frame>,
    root: Option<Rc<Node>>,
    errors: Vec<LoadError>,
}

impl Builder {
    fn start_pos(&self, span: &Span) -> Pos {
        self.source.position(span.start.index())
    }

    fn push(&mut self, node: Rc<Node>) {
        match self.stack.last_mut() {
            Some(frame) => frame.content.push(node),
            None => {
                if self.root.is_none() {
                    self.root = Some(node);
                }
            }
        }
    }

    fn define(&mut self, id: usize, pos: Pos, start: usize) {
        if id == 0 {
            return;
        }
        let name = self.source.anchor_name(start);
        self.anchors.insert(
            id,
            Anchor {
                name,
                pos,
                node: None,
                used: false,
            },
        );
    }

    fn complete(&mut self, id: usize, node: &Rc<Node>) {
        if let Some(anchor) = self.anchors.get_mut(&id) {
            anchor.node = Some(Rc::clone(node));
        }
    }

    fn scalar(
        &mut self,
        value: &str,
        style: ScalarStyle,
        id: usize,
        tag: Option<&Tag>,
        span: &Span,
    ) {
        let style = style_of(style);
        let start = span.start.index();
        let mut pos = self.start_pos(span);
        if matches!(style, Style::Literal | Style::Folded)
            && let Some(header) = self.source.block_header(start)
        {
            pos = self.source.position(header);
        }
        let empty = value.is_empty() && style == Style::Plain && tag.is_none() && id == 0;
        if empty && start == span.end.index() && self.source.chars.get(start) == Some(&':') {
            pos.col += 1;
        }
        self.define(id, pos, start);
        let tag = match tag {
            Some(tag) => short_tag(tag),
            None if style == Style::Plain => resolve(value).to_owned(),
            None => "!!str".to_owned(),
        };
        let node = Rc::new(Node {
            kind: Kind::Scalar,
            tag,
            value: value.to_owned(),
            style,
            pos,
            content: Vec::new(),
        });
        self.complete(id, &node);
        self.push(node);
    }

    fn open(&mut self, kind: Kind, id: usize, tag: Option<&Tag>, span: &Span) {
        let pos = self.start_pos(span);
        self.define(id, pos, span.start.index());
        let tag = tag.map_or_else(
            || {
                if kind == Kind::Sequence {
                    "!!seq"
                } else {
                    "!!map"
                }
                .to_owned()
            },
            short_tag,
        );
        self.stack.push(Frame {
            kind,
            tag,
            pos,
            anchor: id,
            content: Vec::new(),
        });
    }

    fn close(&mut self) {
        let Some(frame) = self.stack.pop() else {
            return;
        };
        let node = Rc::new(Node {
            kind: frame.kind,
            tag: frame.tag,
            value: String::new(),
            style: Style::Plain,
            pos: frame.pos,
            content: frame.content,
        });
        self.complete(frame.anchor, &node);
        self.push(node);
    }

    fn alias(&mut self, id: usize, span: &Span) {
        let pos = self.start_pos(span);
        let Some(anchor) = self.anchors.get_mut(&id) else {
            return;
        };
        anchor.used = true;
        if let Some(node) = &anchor.node {
            let node = Rc::clone(node);
            self.push(node);
            return;
        }
        let message = format!(
            "recursive alias {} is found. anchor was declared at line:{}, column:{}",
            crate::shared::text::quote(&anchor.name),
            anchor.pos.line,
            anchor.pos.col
        );
        self.errors.push(LoadError { pos, message });
        self.push(Rc::new(Node {
            kind: Kind::Alias,
            tag: String::new(),
            value: String::new(),
            style: Style::Plain,
            pos,
            content: Vec::new(),
        }));
    }
}

fn scan_error(source: &Source, info: &str, index: usize, pos: Pos) -> LoadError {
    if info.contains("unknown anchor") {
        let name = source.token_at(index);
        return LoadError {
            pos: Pos::new(0, 0),
            message: format!("could not parse as YAML: yaml: unknown anchor '{name}' referenced"),
        };
    }
    let message = info
        .strip_prefix("while parsing a block mapping, ")
        .or_else(|| info.strip_prefix("while parsing a block collection, "))
        .or_else(|| info.strip_prefix("while parsing a flow sequence, "))
        .or_else(|| info.strip_prefix("while parsing a flow mapping, "))
        .or_else(|| info.strip_prefix("while parsing a node, "))
        .unwrap_or(info);
    LoadError {
        pos,
        message: format!("could not parse as YAML: {message}"),
    }
}

#[must_use]
pub fn load(text: &str) -> Loaded {
    let source = Source {
        chars: text.chars().collect(),
    };
    let mut builder = Builder {
        source,
        anchors: HashMap::new(),
        stack: Vec::new(),
        root: None,
        errors: Vec::new(),
    };
    let mut parser = Parser::new_from_str(text);
    let mut documents = 0;
    while let Some(result) = parser.next_event() {
        let (event, span) = match result {
            Ok(pair) => pair,
            Err(error) => {
                let marker = error.marker();
                let pos = Pos::new(marker.line(), marker.col());
                let failure = scan_error(&builder.source, error.info(), marker.index(), pos);
                return Loaded {
                    root: None,
                    errors: vec![failure],
                };
            }
        };
        match event {
            Event::DocumentStart(_) => {
                documents += 1;
                if documents > 1 {
                    break;
                }
            }
            Event::DocumentEnd | Event::StreamEnd => {
                if documents >= 1 || matches!(event, Event::StreamEnd) {
                    break;
                }
            }
            Event::Scalar(value, style, id, tag) => {
                let tag = tag.as_ref().map(Cow::as_ref);
                builder.scalar(&value, style, id, tag, &span);
            }
            Event::SequenceStart(id, tag) => {
                builder.open(Kind::Sequence, id, tag.as_ref().map(Cow::as_ref), &span);
            }
            Event::MappingStart(id, tag) => {
                builder.open(Kind::Mapping, id, tag.as_ref().map(Cow::as_ref), &span);
            }
            Event::SequenceEnd | Event::MappingEnd => builder.close(),
            Event::Alias(id) => builder.alias(id, &span),
            Event::StreamStart | Event::Nothing => {}
        }
    }
    let mut unused: Vec<&Anchor> = builder.anchors.values().filter(|a| !a.used).collect();
    unused.sort_by_key(|a| a.pos);
    let mut errors = builder.errors.clone();
    errors.extend(unused.into_iter().map(|anchor| LoadError {
        pos: anchor.pos,
        message: format!(
            "anchor {} is defined but not used",
            crate::shared::text::quote(&anchor.name)
        ),
    }));
    Loaded {
        root: builder.root,
        errors,
    }
}
