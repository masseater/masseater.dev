use std::sync::LazyLock;

use regex::Regex;

static FRONT_MATTER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)\A((---[^\S\r\n\u{2028}\u{2029}]*$[\s\S]+?^---\s*)|(\+\+\+[^\S\r\n\u{2028}\u{2029}]*$[\s\S]+?^(\+\+\+|\.\.\.)\s*)|(\{[^\S\r\n\u{2028}\u{2029}]*$[\s\S]+?^\}\s*))(\n|\z)",
    )
    .expect("front matter pattern")
});

pub struct Source {
    pub text: String,
    pub line_starts: Vec<usize>,
    pub body_start: usize,
    pub body_line: usize,
    pub sanitized: String,
}

impl Source {
    #[must_use]
    pub fn new(raw: &str) -> Self {
        let without_bom = raw.strip_prefix('\u{feff}').unwrap_or(raw);
        let mut text = normalize_newlines(without_bom);
        let mut body_start = FRONT_MATTER.find(&text).map_or(0, |m| m.end());
        if body_start > 0 && body_start == text.len() && !text.ends_with('\n') {
            text.push('\n');
            body_start = text.len();
        }
        let mut line_starts = vec![0];
        line_starts.extend(
            text.bytes()
                .enumerate()
                .filter(|&(_, b)| b == b'\n')
                .map(|(i, _)| i + 1),
        );
        let body_line = line_starts.partition_point(|&start| start < body_start);
        let body_line = if body_start == 0 { 0 } else { body_line };
        let sanitized = format!(
            "{}{}",
            &text[..body_start],
            clear_html_comment_text(&text[body_start..])
        );
        Self {
            text,
            line_starts,
            body_start,
            body_line,
            sanitized,
        }
    }

    #[must_use]
    pub fn line_count(&self) -> usize {
        self.line_starts.len()
    }

    #[must_use]
    pub fn line_range(&self, index: usize) -> (usize, usize) {
        let start = self.line_starts[index];
        let end = self
            .line_starts
            .get(index + 1)
            .map_or(self.text.len(), |next| next - 1);
        (start, end)
    }

    #[must_use]
    pub fn line(&self, index: usize) -> &str {
        let (start, end) = self.line_range(index);
        &self.text[start..end]
    }

    #[must_use]
    pub fn sanitized_line(&self, index: usize) -> &str {
        let (start, end) = self.line_range(index);
        &self.sanitized[start..end]
    }

    #[must_use]
    pub fn line_of(&self, offset: usize) -> usize {
        self.line_starts.partition_point(|&start| start <= offset) - 1
    }

    #[must_use]
    pub fn column_of(&self, offset: usize) -> usize {
        let line = self.line_of(offset);
        utf16_len(&self.text[self.line_starts[line]..offset]) + 1
    }

    #[must_use]
    pub fn body_lines(&self) -> std::ops::Range<usize> {
        self.body_line..self.line_count()
    }

    #[must_use]
    pub fn front_matter_lines(&self) -> Vec<&str> {
        (0..self.body_line).map(|index| self.line(index)).collect()
    }
}

#[must_use]
pub fn utf16_len(text: &str) -> usize {
    text.chars().map(char::len_utf16).sum()
}

fn normalize_newlines(text: &str) -> String {
    if text.contains('\r') {
        text.replace("\r\n", "\n").replace('\r', "\n")
    } else {
        text.to_owned()
    }
}

const COMMENT_BEGIN: &str = "<!--";
const COMMENT_END: &str = "-->";

fn clear_html_comment_text(text: &str) -> String {
    let mut out = text.to_owned();
    let mut i = 0;
    while let Some(found) = out[i..].find(COMMENT_BEGIN) {
        let begin = i + found;
        let Some(end_found) = out[begin + 2..].find(COMMENT_END) else {
            break;
        };
        let end = begin + 2 + end_found;
        if end > begin + COMMENT_BEGIN.len() {
            let content = &out[begin + COMMENT_BEGIN.len()..end];
            let line_start = out[..begin].rfind('\n').map_or(0, |p| p + 1);
            let pre = &out[line_start..begin];
            let is_block = pre.trim().is_empty();
            let could_be_table = pre.trim_start_matches(' ').starts_with('|');
            let spans_cells = could_be_table && content.contains('\n');
            let valid = is_block
                || !(spans_cells
                    || content.starts_with('>')
                    || content.starts_with("->")
                    || content.ends_with('-')
                    || content.contains("--"));
            if valid {
                let cleared = clear_comment_content(content);
                out.replace_range(begin + COMMENT_BEGIN.len()..end, &cleared);
            }
        }
        i = end + COMMENT_END.len();
    }
    out
}

fn clear_comment_content(content: &str) -> String {
    let segments: Vec<&str> = content.split('\n').collect();
    let last = segments.len() - 1;
    segments
        .iter()
        .enumerate()
        .map(|(index, line)| {
            let trimmed_len = if index == last {
                line.len()
            } else {
                line.trim_end_matches(' ').len()
            };
            let head = &line[..trimmed_len];
            let cleared: String = head
                .chars()
                .map(|c| match c.len_utf8() {
                    _ if c == ' ' => " ",
                    1 => ".",
                    2 => "\u{b7}",
                    3 => "\u{2026}",
                    _ => "\u{b7}\u{b7}",
                })
                .collect();
            format!("{cleared}{}", ".".repeat(line.len() - trimmed_len))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::Source;

    #[test]
    fn splits_front_matter() {
        let source = Source::new("---\ntitle: x\n---\n# Heading\n");
        assert_eq!(source.body_line, 3);
        assert_eq!(source.line(3), "# Heading");
    }

    #[test]
    fn hides_comment_text() {
        let source = Source::new("a <!-- secret --> b\n");
        assert_eq!(source.sanitized_line(0), "a <!-- ...... --> b");
    }
}
