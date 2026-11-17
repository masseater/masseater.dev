use pulldown_cmark::{Event, Options, Parser, Tag};

use crate::entities::import::{Edge, Target};
use crate::shared::text::{Lines, join, normalize, parent};

const SCHEMES: [&str; 4] = ["mailto:", "tel:", "data:", "javascript:"];
const HEX: u32 = 16;

fn decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        let escaped = (bytes[index] == b'%')
            .then(|| text.get(index + 1..index + 3))
            .flatten()
            .and_then(|hex| u8::from_str_radix(hex, HEX).ok());
        if let Some(value) = escaped {
            out.push(value);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| text.to_owned())
}

fn local(destination: &str) -> Option<&str> {
    let trimmed = destination.trim();
    if trimmed.starts_with('#')
        || trimmed.starts_with('/')
        || trimmed.contains("://")
        || SCHEMES.iter().any(|scheme| trimmed.starts_with(scheme))
    {
        return None;
    }
    let end = trimmed.find(['#', '?']).unwrap_or(trimmed.len());
    let path = &trimmed[..end];
    (!path.is_empty()).then_some(path)
}

fn target_of(from: &str, destination: &str) -> String {
    let decoded = decode(destination);
    normalize(&join(parent(from), &decoded)).unwrap_or_else(|| format!("../{decoded}"))
}

#[must_use]
pub fn links(path: &str, text: &str) -> Vec<Edge> {
    let lines = Lines::new(text);
    let options = Options::ENABLE_TABLES
        | Options::ENABLE_FOOTNOTES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_YAML_STYLE_METADATA_BLOCKS;
    Parser::new_ext(text, options)
        .into_offset_iter()
        .filter_map(|(event, range)| match event {
            Event::Start(Tag::Link { dest_url, .. } | Tag::Image { dest_url, .. }) => {
                let destination = local(&dest_url)?.to_owned();
                let (line, column) = lines.position(range.start);
                Some(Edge {
                    from: path.to_owned(),
                    target: Target::File(target_of(path, &destination)),
                    specifier: destination,
                    line,
                    column,
                    wildcard: false,
                })
            }
            _ => None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::links;
    use crate::entities::import::Target;

    #[test]
    fn resolves_local_links_and_skips_the_rest() {
        let text = "[a](./guide%20one.md#top) [b](https://x.dev) [c](#here) [d](/site)\n![e](../img/logo.png?raw)\n[f](mailto:me@x.dev)\n";
        let found: Vec<(String, usize)> = links("docs/index.md", text)
            .into_iter()
            .map(|edge| match edge.target {
                Target::File(path) => (path, edge.line),
                Target::Module(path) => (path.join("::"), edge.line),
            })
            .collect();
        assert_eq!(
            found,
            vec![
                ("docs/guide one.md".to_owned(), 1),
                ("img/logo.png".to_owned(), 2)
            ]
        );
    }
    #[test]
    fn reads_reference_links_and_skips_code() {
        let text = "See [guide][g] and `[x](./code.md)`.\n\n```md\n[y](./fenced.md)\n```\n\n[g]: ../guide.md\n";
        let found: Vec<(String, usize, usize)> = links("docs/a/index.md", text)
            .into_iter()
            .map(|edge| match edge.target {
                Target::File(path) => (path, edge.line, edge.column),
                Target::Module(path) => (path.join("::"), edge.line, edge.column),
            })
            .collect();
        assert_eq!(found, vec![("docs/guide.md".to_owned(), 1, 5)]);
    }

    #[test]
    fn keeps_links_that_climb_out_of_the_repository() {
        let found: Vec<String> = links("README.md", "[up](../../x.md)\n")
            .into_iter()
            .map(|edge| match edge.target {
                Target::File(path) => path,
                Target::Module(path) => path.join("::"),
            })
            .collect();
        assert_eq!(found, vec!["../../../x.md"]);
    }
}
