use std::collections::HashMap;
use std::rc::Rc;

use tracing::info_span;

use crate::shared::concrete;
use crate::shared::transfer::{Buffer, SemanticRecord};
use crate::shared::yaml::{Kind, Node, Style, load};

const fn kind_code(kind: Kind) -> u32 {
    match kind {
        Kind::Scalar => 0,
        Kind::Sequence => 1,
        Kind::Mapping => 2,
        Kind::Alias => 3,
    }
}

const fn style_code(style: Style) -> u32 {
    match style {
        Style::Plain => 0,
        Style::SingleQuoted => 1,
        Style::DoubleQuoted => 2,
        Style::Literal => 3,
        Style::Folded => 4,
    }
}

struct Semantic<'a> {
    buffer: &'a mut Buffer,
    seen: HashMap<*const Node, u32>,
}

impl Semantic<'_> {
    fn encode(&mut self, node: &Rc<Node>) -> u32 {
        let key = Rc::as_ptr(node);
        if let Some(id) = self.seen.get(&key) {
            return *id;
        }
        let ids: Vec<u32> = node
            .content
            .iter()
            .map(|child| self.encode(child))
            .collect();
        let tag = self.buffer.string(&node.tag);
        let value = self.buffer.string(&node.value);
        let children = self.buffer.children(&ids);
        let id = self.buffer.semantic(SemanticRecord {
            kind: kind_code(node.kind),
            tag,
            value,
            style: style_code(node.style),
            line: node.pos.line as u32,
            column: node.pos.col as u32,
            children,
        });
        self.seen.insert(key, id);
        id
    }
}

#[must_use]
pub fn encode_document(text: &str) -> Vec<u8> {
    let _span = info_span!("fu4.encode_document", "fu4.bytes" = text.len()).entered();
    let mut buffer = Buffer::default();
    buffer.string(text);
    let loaded = load(text);
    for error in &loaded.errors {
        buffer.error(error.pos.line as u32, error.pos.col as u32, &error.message);
    }
    if let Some(root) = &loaded.root {
        let mut semantic = Semantic {
            buffer: &mut buffer,
            seen: HashMap::new(),
        };
        let id = semantic.encode(root);
        buffer.set_semantic_root(id);
    }
    concrete::write(&mut buffer, &tree_sitter_yaml::LANGUAGE.into(), text);
    buffer.finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::transfer::{HEADER_WORDS, NONE, SEMANTIC_WORDS};

    fn words(bytes: &[u8]) -> Vec<u32> {
        bytes
            .chunks_exact(4)
            .map(|chunk| u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect()
    }

    #[test]
    fn shares_aliased_nodes_and_keeps_both_trees() {
        let all = words(&encode_document("a: &x 1\nb: *x\n"));
        let semantic = all[1] as usize;
        assert_eq!(semantic, 4);
        let root = all[2] as usize;
        let record = &all[HEADER_WORDS + root * SEMANTIC_WORDS..][..SEMANTIC_WORDS];
        assert_eq!((record[0], record[7]), (2, 4));
        let children_base = HEADER_WORDS + semantic * SEMANTIC_WORDS + all[3] as usize * 8;
        let start = record[6] as usize;
        let ids = &all[children_base + start..children_base + start + 4];
        assert_eq!(ids[1], ids[3]);
        assert_ne!(all[4], NONE);
    }

    #[test]
    fn records_load_errors() {
        let all = words(&encode_document("a: [\n"));
        assert_eq!(all[2], NONE);
        assert_eq!(all[6], 1);
    }
}
