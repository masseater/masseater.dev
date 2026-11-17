use std::collections::HashMap;

use crate::entities::import::{Edge, Target};

pub const HEADER_WORDS: usize = 3;
pub const EDGE_WORDS: usize = 7;
const WORD: usize = 4;
const FILE: u32 = 0;
const MODULE: u32 = 1;
const MODULE_SEPARATOR: &str = "::";

#[derive(Default)]
struct Strings {
    index: HashMap<String, u32>,
    spans: Vec<u32>,
    blob: Vec<u8>,
}

impl Strings {
    fn add(&mut self, value: &str) -> u32 {
        if let Some(found) = self.index.get(value) {
            return *found;
        }
        let index = (self.spans.len() / 2) as u32;
        self.spans.push(self.blob.len() as u32);
        self.spans.push(value.len() as u32);
        self.blob.extend_from_slice(value.as_bytes());
        self.index.insert(value.to_owned(), index);
        index
    }
}

fn word(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

#[must_use]
pub fn encode(files: Vec<String>, edges: &[Edge]) -> Vec<u32> {
    let positions: HashMap<String, u32> = files
        .into_iter()
        .enumerate()
        .map(|(index, file)| (file, word(index)))
        .collect();
    let mut strings = Strings::default();
    let mut records = Vec::with_capacity(edges.len() * EDGE_WORDS);
    for edge in edges {
        let (kind, target) = match &edge.target {
            Target::File(path) => (FILE, strings.add(path)),
            Target::Module(path) => (MODULE, strings.add(&path.join(MODULE_SEPARATOR))),
        };
        records.extend_from_slice(&[
            positions
                .get(edge.from.as_str())
                .copied()
                .unwrap_or(u32::MAX),
            kind,
            target,
            strings.add(&edge.specifier),
            word(edge.line),
            word(edge.column),
            u32::from(edge.wildcard),
        ]);
    }
    let blob_words = strings.blob.len().div_ceil(WORD);
    let mut out =
        Vec::with_capacity(HEADER_WORDS + records.len() + strings.spans.len() + blob_words);
    out.extend_from_slice(&[
        word(edges.len()),
        word(strings.spans.len() / 2),
        word(strings.blob.len()),
    ]);
    out.extend_from_slice(&records);
    out.extend_from_slice(&strings.spans);
    strings.blob.resize(blob_words * WORD, 0);
    out.extend(
        strings
            .blob
            .as_chunks::<WORD>()
            .0
            .iter()
            .map(|chunk| u32::from_le_bytes(*chunk)),
    );
    out
}

#[cfg(test)]
mod tests {
    use super::{EDGE_WORDS, HEADER_WORDS, encode};
    use crate::entities::import::{Edge, Target};
    use crate::shared::fixture::files;

    fn text(buffer: &[u32], index: u32) -> String {
        let count = buffer[1] as usize;
        let spans = HEADER_WORDS + buffer[0] as usize * EDGE_WORDS;
        let blob: Vec<u8> = buffer[spans + count * 2..]
            .iter()
            .flat_map(|value| value.to_le_bytes())
            .collect();
        let start = buffer[spans + index as usize * 2] as usize;
        let length = buffer[spans + index as usize * 2 + 1] as usize;
        String::from_utf8(blob[start..start + length].to_vec()).expect("the text is UTF-8")
    }

    #[test]
    fn writes_edges_and_a_shared_string_table() {
        let edges = vec![
            Edge {
                from: "b.ts".to_owned(),
                specifier: "./ä.ts".to_owned(),
                target: Target::File("ä.ts".to_owned()),
                line: 2,
                column: 9,
                wildcard: true,
            },
            Edge {
                from: "src/x.rs".to_owned(),
                specifier: "crate::app".to_owned(),
                target: Target::Module(vec!["app".to_owned()]),
                line: 1,
                column: 5,
                wildcard: false,
            },
        ];
        let buffer = encode(files(&["a.ts", "b.ts", "src/x.rs"]), &edges);
        assert_eq!(buffer[0], 2);
        assert_eq!(buffer[1], 4);
        let first = &buffer[HEADER_WORDS..HEADER_WORDS + EDGE_WORDS];
        assert_eq!(
            (first[0], first[1], first[4], first[5], first[6]),
            (1, 0, 2, 9, 1)
        );
        assert_eq!(text(&buffer, first[2]), "ä.ts");
        assert_eq!(text(&buffer, first[3]), "./ä.ts");
        let second = &buffer[HEADER_WORDS + EDGE_WORDS..HEADER_WORDS + EDGE_WORDS * 2];
        assert_eq!((second[0], second[1], second[6]), (2, 1, 0));
        assert_eq!(text(&buffer, second[2]), "app");
        assert_eq!(text(&buffer, second[3]), "crate::app");
    }

    #[test]
    fn writes_only_the_header_without_edges() {
        assert_eq!(encode(Vec::new(), &[]), vec![0, 0, 0]);
    }
}
