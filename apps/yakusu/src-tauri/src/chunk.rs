/// The number of characters above which a source text is split into separate requests.
pub const CHUNK_CHARS: usize = 1000;

/// A slice of the source text: text to translate, or whitespace that is copied as it is.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Part<'a> {
    Text(&'a str),
    Space(&'a str),
}

fn paragraph_breaks(text: &str, start: usize, end: usize) -> Vec<(usize, usize)> {
    let mut breaks = Vec::new();
    let mut run: Option<(usize, usize)> = None;
    for (offset, character) in text[start..end].char_indices() {
        let index = start + offset;
        if character.is_whitespace() {
            let (run_start, newlines) = run.unwrap_or((index, 0));
            run = Some((run_start, newlines + usize::from(character == '\n')));
        } else if let Some((run_start, newlines)) = run.take()
            && newlines >= 2
        {
            breaks.push((run_start, index));
        }
    }
    breaks
}

fn char_count(text: &str, start: usize, end: usize) -> usize {
    text[start..end].chars().count()
}

/// Splits `text` at blank lines into pieces of at most `limit` characters, keeping each
/// paragraph whole. Joining the parts gives back `text`.
#[must_use]
pub fn split(text: &str, limit: usize) -> Vec<Part<'_>> {
    let start = text.len() - text.trim_start().len();
    let end = text.trim_end().len();
    if start >= end {
        return if text.is_empty() {
            Vec::new()
        } else {
            vec![Part::Space(text)]
        };
    }
    let breaks = paragraph_breaks(text, start, end);
    let mut paragraphs = Vec::with_capacity(breaks.len() + 1);
    let mut paragraph_start = start;
    for &(break_start, break_end) in &breaks {
        paragraphs.push((paragraph_start, break_start));
        paragraph_start = break_end;
    }
    paragraphs.push((paragraph_start, end));

    let mut parts = Vec::new();
    if start > 0 {
        parts.push(Part::Space(&text[..start]));
    }
    let mut chunk = paragraphs[0];
    for &(paragraph_start, paragraph_end) in &paragraphs[1..] {
        if char_count(text, chunk.0, paragraph_end) <= limit {
            chunk.1 = paragraph_end;
        } else {
            parts.push(Part::Text(&text[chunk.0..chunk.1]));
            parts.push(Part::Space(&text[chunk.1..paragraph_start]));
            chunk = (paragraph_start, paragraph_end);
        }
    }
    parts.push(Part::Text(&text[chunk.0..chunk.1]));
    if end < text.len() {
        parts.push(Part::Space(&text[end..]));
    }
    parts
}

#[cfg(test)]
mod tests {
    use super::*;

    fn joined(parts: &[Part<'_>]) -> String {
        parts
            .iter()
            .map(|part| match part {
                Part::Text(text) | Part::Space(text) => *text,
            })
            .collect()
    }

    #[test]
    fn keeps_a_short_text_in_one_part() {
        assert_eq!(
            split("First line.\nSecond line.\n\nNext paragraph.", 1000),
            vec![Part::Text("First line.\nSecond line.\n\nNext paragraph.")]
        );
    }

    #[test]
    fn copies_surrounding_whitespace() {
        assert_eq!(
            split("\n  Hello.  \n", 1000),
            vec![
                Part::Space("\n  "),
                Part::Text("Hello."),
                Part::Space("  \n")
            ]
        );
    }

    #[test]
    fn splits_at_blank_lines_when_the_text_is_long() {
        let text = "aaaa\n\nbbbb\n \n\ncccc\ndddd";
        let parts = split(text, 10);
        assert_eq!(
            parts,
            vec![
                Part::Text("aaaa\n\nbbbb"),
                Part::Space("\n \n\n"),
                Part::Text("cccc\ndddd"),
            ]
        );
        assert_eq!(joined(&parts), text);
    }

    #[test]
    fn keeps_an_oversized_paragraph_whole() {
        assert_eq!(
            split("あいうえおかきくけこ\n\nさ", 5),
            vec![
                Part::Text("あいうえおかきくけこ"),
                Part::Space("\n\n"),
                Part::Text("さ"),
            ]
        );
    }

    #[test]
    fn treats_crlf_blank_lines_as_breaks() {
        let text = "one\r\n\r\ntwo";
        assert_eq!(
            split(text, 3),
            vec![
                Part::Text("one"),
                Part::Space("\r\n\r\n"),
                Part::Text("two")
            ]
        );
    }

    #[test]
    fn returns_whitespace_only_text_as_space() {
        assert_eq!(split(" \n ", 10), vec![Part::Space(" \n ")]);
        assert_eq!(split("", 10), Vec::<Part<'_>>::new());
    }
}
