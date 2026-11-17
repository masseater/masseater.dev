mod decode;
mod load;
mod resolve;

use std::rc::Rc;

pub use decode::Decoder;
pub use load::load;
pub use resolve::parse_go_float;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default, serde::Serialize)]
pub struct Pos {
    pub line: usize,
    pub col: usize,
}

impl Pos {
    #[must_use]
    pub const fn new(line: usize, col: usize) -> Self {
        Self { line, col }
    }

    #[must_use]
    pub fn describe(&self) -> String {
        format!("line:{},col:{}", self.line, self.col)
    }

    #[must_use]
    pub fn is_before(&self, other: &Pos) -> bool {
        (self.line, self.col) < (other.line, other.col)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Scalar,
    Sequence,
    Mapping,
    Alias,
}

impl Kind {
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Kind::Scalar => "scalar",
            Kind::Sequence => "sequence",
            Kind::Mapping => "mapping",
            Kind::Alias => "alias",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Style {
    Plain,
    SingleQuoted,
    DoubleQuoted,
    Literal,
    Folded,
}

#[derive(Debug)]
pub struct Node {
    pub kind: Kind,
    pub tag: String,
    pub value: String,
    pub style: Style,
    pub pos: Pos,
    pub content: Vec<Rc<Node>>,
}

impl Node {
    #[must_use]
    pub fn is_quoted(&self) -> bool {
        matches!(self.style, Style::SingleQuoted | Style::DoubleQuoted)
    }

    #[must_use]
    pub fn is_null(&self) -> bool {
        self.kind == Kind::Scalar && self.tag == "!!null"
    }

    pub fn pairs(&self) -> impl Iterator<Item = (&Rc<Node>, &Rc<Node>)> {
        self.content
            .as_chunks::<2>()
            .0
            .iter()
            .map(|[key, value]| (key, value))
    }

    #[must_use]
    pub fn get(&self, key: &str) -> Option<&Rc<Node>> {
        self.pairs()
            .find(|(name, _)| name.value == key)
            .map(|(_, value)| value)
    }
}
