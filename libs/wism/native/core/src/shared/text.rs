pub struct Lines {
    starts: Vec<usize>,
}

impl Lines {
    #[must_use]
    pub fn new(text: &str) -> Self {
        let mut starts = vec![0];
        starts.extend(text.match_indices('\n').map(|(index, _)| index + 1));
        Self { starts }
    }

    #[must_use]
    pub fn position(&self, offset: usize) -> (usize, usize) {
        let line = self.starts.partition_point(|start| *start <= offset);
        let start = self.starts[line - 1];
        (line, offset - start + 1)
    }
}

#[must_use]
pub fn parent(path: &str) -> &str {
    path.rfind('/').map_or("", |index| &path[..index])
}

#[must_use]
pub fn join(dir: &str, name: &str) -> String {
    if dir.is_empty() {
        name.to_owned()
    } else {
        format!("{dir}/{name}")
    }
}

#[must_use]
pub fn inside<'a>(path: &'a str, dir: &str) -> Option<&'a str> {
    if dir.is_empty() {
        return Some(path);
    }
    path.strip_prefix(dir)?.strip_prefix('/')
}

#[must_use]
pub fn normalize(path: &str) -> Option<String> {
    let mut parts: Vec<&str> = Vec::new();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop()?;
            }
            other => parts.push(other),
        }
    }
    Some(parts.join("/"))
}

#[must_use]
pub fn has_extension(path: &str, extensions: &[&str]) -> bool {
    std::path::Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extensions
                .iter()
                .any(|wanted| extension.eq_ignore_ascii_case(wanted))
        })
}

#[cfg(test)]
mod tests {
    use super::{Lines, has_extension, inside, join, normalize, parent};

    #[test]
    fn turns_offsets_into_lines_and_columns() {
        let lines = Lines::new("ab\ncd\n\nef");
        assert_eq!(lines.position(0), (1, 1));
        assert_eq!(lines.position(4), (2, 2));
        assert_eq!(lines.position(6), (3, 1));
        assert_eq!(lines.position(8), (4, 2));
    }

    #[test]
    fn works_on_slash_separated_paths() {
        assert_eq!(parent("a/b/c.ts"), "a/b");
        assert_eq!(parent("c.ts"), "");
        assert_eq!(join("", "c.ts"), "c.ts");
        assert_eq!(join("a", "c.ts"), "a/c.ts");
        assert_eq!(inside("a/b/c.ts", "a"), Some("b/c.ts"));
        assert_eq!(inside("ab/c.ts", "a"), None);
        assert_eq!(inside("c.ts", ""), Some("c.ts"));
        assert_eq!(normalize("a/./b/../c.md"), Some("a/c.md".to_owned()));
        assert_eq!(normalize("../c.md"), None);
        assert!(has_extension("a/B.TS", &["ts"]));
        assert!(!has_extension("a/b.tsx", &["ts"]));
        assert!(!has_extension("Makefile", &["ts"]));
    }
}
