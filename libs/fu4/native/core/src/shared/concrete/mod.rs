use tree_sitter::{Language, Node, Parser, TreeCursor};

use crate::shared::transfer::{
    Buffer, ConcreteRecord, ERROR, EXTRA, MISSING, NAMED, NONE, utf16_offsets,
};

fn flags(node: Node<'_>) -> u32 {
    let mut flags = 0;
    if node.is_named() {
        flags |= NAMED;
    }
    if node.is_error() {
        flags |= ERROR;
    }
    if node.is_missing() {
        flags |= MISSING;
    }
    if node.is_extra() {
        flags |= EXTRA;
    }
    flags
}

fn encode(buffer: &mut Buffer, cursor: &mut TreeCursor<'_>, offsets: &[u32], parent: u32) -> u32 {
    let node = cursor.node();
    let kind = buffer.string(node.kind());
    let field = cursor.field_name().map_or(NONE, |name| buffer.string(name));
    let id = buffer.concrete(ConcreteRecord {
        kind,
        flags: flags(node),
        start: offsets[node.start_byte()],
        end: offsets[node.end_byte()],
        field,
        parent,
        children: (0, 0),
    });
    let mut ids = Vec::new();
    if cursor.goto_first_child() {
        loop {
            ids.push(encode(buffer, cursor, offsets, id));
            if !cursor.goto_next_sibling() {
                break;
            }
        }
        cursor.goto_parent();
    }
    let children = buffer.children(&ids);
    buffer.concrete_mut(id).children = children;
    id
}

pub fn write(buffer: &mut Buffer, language: &Language, text: &str) {
    let mut parser = Parser::new();
    if parser.set_language(language).is_err() {
        return;
    }
    let Some(tree) = parser.parse(text, None) else {
        return;
    };
    let offsets = utf16_offsets(text);
    let mut cursor = tree.walk();
    let root = encode(buffer, &mut cursor, &offsets, NONE);
    buffer.set_concrete_root(root);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::transfer::{CONCRETE_WORDS, HEADER_WORDS};

    #[test]
    fn writes_the_tree_with_parents_fields_and_utf16_spans() {
        let mut buffer = Buffer::default();
        let text = "é: 1\n";
        buffer.string(text);
        write(&mut buffer, &tree_sitter_yaml::LANGUAGE.into(), text);
        let bytes = buffer.finish();
        let words: Vec<u32> = bytes
            .as_chunks::<4>()
            .0
            .iter()
            .map(|chunk| u32::from_le_bytes(*chunk))
            .collect();
        let count = words[3] as usize;
        assert!(count > 3);
        assert_eq!(words[4], 0);
        let root = &words[HEADER_WORDS..HEADER_WORDS + CONCRETE_WORDS];
        assert_eq!((root[2], root[3], root[5]), (0, 5, NONE));
        let fields: Vec<u32> = (0..count)
            .map(|index| words[HEADER_WORDS + index * CONCRETE_WORDS + 4])
            .collect();
        assert!(fields.iter().any(|field| *field != NONE));
    }
}
