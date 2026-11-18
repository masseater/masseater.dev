mod load;
mod resolve;

use std::rc::Rc;

pub use load::load;

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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Scalar,
    Sequence,
    Mapping,
    Alias,
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
