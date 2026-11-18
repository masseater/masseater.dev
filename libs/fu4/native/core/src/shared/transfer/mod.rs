use std::collections::HashMap;

pub const VERSION: u32 = 1;
pub const NONE: u32 = u32::MAX;
pub const HEADER_WORDS: usize = 8;
pub const SEMANTIC_WORDS: usize = 8;
pub const CONCRETE_WORDS: usize = 8;
pub const ERROR_WORDS: usize = 3;

pub const NAMED: u32 = 1;
pub const ERROR: u32 = 2;
pub const MISSING: u32 = 4;
pub const EXTRA: u32 = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SemanticRecord {
    pub kind: u32,
    pub tag: u32,
    pub value: u32,
    pub style: u32,
    pub line: u32,
    pub column: u32,
    pub children: (u32, u32),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConcreteRecord {
    pub kind: u32,
    pub flags: u32,
    pub start: u32,
    pub end: u32,
    pub field: u32,
    pub parent: u32,
    pub children: (u32, u32),
}

#[derive(Default)]
pub struct Buffer {
    semantic: Vec<SemanticRecord>,
    semantic_root: Option<u32>,
    concrete: Vec<ConcreteRecord>,
    concrete_root: Option<u32>,
    children: Vec<u32>,
    errors: Vec<[u32; ERROR_WORDS]>,
    spans: Vec<u32>,
    blob: Vec<u16>,
    interned: HashMap<String, u32>,
}

#[must_use]
pub fn utf16_offsets(text: &str) -> Vec<u32> {
    let mut offsets = Vec::with_capacity(text.len() + 1);
    let mut units = 0u32;
    for character in text.chars() {
        for _ in 0..character.len_utf8() {
            offsets.push(units);
        }
        units += character.len_utf16() as u32;
    }
    offsets.push(units);
    offsets
}

impl Buffer {
    pub fn string(&mut self, value: &str) -> u32 {
        if let Some(index) = self.interned.get(value) {
            return *index;
        }
        let index = (self.spans.len() / 2) as u32;
        self.spans.push(self.blob.len() as u32);
        let start = self.blob.len();
        self.blob.extend(value.encode_utf16());
        self.spans.push((self.blob.len() - start) as u32);
        self.interned.insert(value.to_owned(), index);
        index
    }

    pub fn children(&mut self, ids: &[u32]) -> (u32, u32) {
        let start = self.children.len() as u32;
        self.children.extend_from_slice(ids);
        (start, ids.len() as u32)
    }

    pub fn semantic(&mut self, record: SemanticRecord) -> u32 {
        self.semantic.push(record);
        (self.semantic.len() - 1) as u32
    }

    pub fn set_semantic_root(&mut self, root: u32) {
        self.semantic_root = Some(root);
    }

    pub fn concrete(&mut self, record: ConcreteRecord) -> u32 {
        self.concrete.push(record);
        (self.concrete.len() - 1) as u32
    }

    pub fn concrete_mut(&mut self, id: u32) -> &mut ConcreteRecord {
        &mut self.concrete[id as usize]
    }

    pub fn set_concrete_root(&mut self, root: u32) {
        self.concrete_root = Some(root);
    }

    pub fn error(&mut self, line: u32, column: u32, message: &str) {
        let message = self.string(message);
        self.errors.push([line, column, message]);
    }

    #[must_use]
    pub fn finish(self) -> Vec<u8> {
        let mut words = Vec::with_capacity(
            HEADER_WORDS
                + self.semantic.len() * SEMANTIC_WORDS
                + self.concrete.len() * CONCRETE_WORDS
                + self.children.len()
                + self.errors.len() * ERROR_WORDS
                + self.spans.len(),
        );
        words.extend([
            VERSION,
            self.semantic.len() as u32,
            self.semantic_root.unwrap_or(NONE),
            self.concrete.len() as u32,
            self.concrete_root.unwrap_or(NONE),
            self.children.len() as u32,
            self.errors.len() as u32,
            (self.spans.len() / 2) as u32,
        ]);
        for record in &self.semantic {
            words.extend([
                record.kind,
                record.tag,
                record.value,
                record.style,
                record.line,
                record.column,
                record.children.0,
                record.children.1,
            ]);
        }
        for record in &self.concrete {
            words.extend([
                record.kind,
                record.flags,
                record.start,
                record.end,
                record.field,
                record.parent,
                record.children.0,
                record.children.1,
            ]);
        }
        words.extend_from_slice(&self.children);
        for error in &self.errors {
            words.extend_from_slice(error);
        }
        words.extend_from_slice(&self.spans);
        let mut bytes = Vec::with_capacity(words.len() * 4 + self.blob.len() * 2);
        for word in words {
            bytes.extend_from_slice(&word.to_le_bytes());
        }
        for unit in self.blob {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn words(bytes: &[u8]) -> Vec<u32> {
        bytes
            .chunks_exact(4)
            .map(|chunk| u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect()
    }

    #[test]
    fn interns_strings_once_and_writes_utf16() {
        let mut buffer = Buffer::default();
        let first = buffer.string("é");
        let again = buffer.string("é");
        let second = buffer.string("ab");
        assert_eq!((first, again, second), (0, 0, 1));
        let bytes = buffer.finish();
        let header = words(&bytes[..HEADER_WORDS * 4]);
        assert_eq!(header, vec![VERSION, 0, NONE, 0, NONE, 0, 0, 2]);
        let spans = words(&bytes[HEADER_WORDS * 4..(HEADER_WORDS + 4) * 4]);
        assert_eq!(spans, vec![0, 1, 1, 2]);
        let blob = &bytes[(HEADER_WORDS + 4) * 4..];
        assert_eq!(blob, &[0xe9, 0, b'a', 0, b'b', 0]);
    }

    #[test]
    fn maps_byte_offsets_to_utf16_units() {
        assert_eq!(utf16_offsets("aé😀"), vec![0, 1, 1, 2, 2, 2, 2, 4]);
    }

    #[test]
    fn lays_out_records_children_and_errors() {
        let mut buffer = Buffer::default();
        let kind = buffer.string("k");
        let children = buffer.children(&[1]);
        let root = buffer.semantic(SemanticRecord {
            kind: 2,
            tag: kind,
            value: kind,
            style: 0,
            line: 1,
            column: 1,
            children,
        });
        buffer.set_semantic_root(root);
        buffer.error(3, 4, "bad");
        let all = words(&buffer.finish());
        assert_eq!(&all[..HEADER_WORDS], &[VERSION, 1, 0, 0, NONE, 1, 1, 2]);
        assert_eq!(
            &all[HEADER_WORDS..HEADER_WORDS + SEMANTIC_WORDS],
            &[2, 0, 0, 0, 1, 1, 0, 1]
        );
        assert_eq!(all[HEADER_WORDS + SEMANTIC_WORDS], 1);
        assert_eq!(
            &all[HEADER_WORDS + SEMANTIC_WORDS + 1..HEADER_WORDS + SEMANTIC_WORDS + 4],
            &[3, 4, 1]
        );
    }
}
