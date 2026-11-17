use std::path::{Path, PathBuf};

use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_resolver::{ResolveOptions, Resolver};
use oxc_span::SourceType;

use crate::entities::import::{Edge, Target};
use crate::shared::text::Lines;

const EXTENSIONS: [&str; 9] = [
    ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json",
];
const CONDITIONS: [&str; 4] = ["types", "import", "node", "default"];

pub struct Scripts {
    root: PathBuf,
    resolver: Resolver,
}

struct Request {
    specifier: String,
    offset: usize,
    wildcard: bool,
}

fn owned(items: &[&str]) -> Vec<String> {
    items.iter().map(|item| (*item).to_owned()).collect()
}

fn unquote(text: &str) -> Option<&str> {
    let first = text.chars().next()?;
    if !matches!(first, '"' | '\'' | '`') {
        return None;
    }
    let inner = text.strip_prefix(first)?.strip_suffix(first)?;
    (!inner.contains("${")).then_some(inner)
}

fn requests(path: &str, text: &str) -> Vec<Request> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or_default();
    let parsed = Parser::new(&allocator, text, source_type).parse();
    let record = &parsed.module_record;
    let mut found: Vec<Request> = Vec::new();
    for (specifier, requested) in &record.requested_modules {
        for request in requested {
            found.push(Request {
                specifier: specifier.to_string(),
                offset: request.span.start as usize,
                wildcard: false,
            });
        }
    }
    for entry in &record.star_export_entries {
        if let Some(request) = &entry.module_request {
            found.push(Request {
                specifier: request.name.to_string(),
                offset: request.span.start as usize,
                wildcard: true,
            });
        }
    }
    for dynamic in &record.dynamic_imports {
        let span = dynamic.module_request;
        let raw = &text[span.start as usize..span.end as usize];
        if let Some(specifier) = unquote(raw.trim()) {
            found.push(Request {
                specifier: specifier.to_owned(),
                offset: span.start as usize,
                wildcard: false,
            });
        }
    }
    found.sort_by_key(|request| request.offset);
    found
}

impl Scripts {
    #[must_use]
    pub fn new(root: &Path) -> Self {
        let options = ResolveOptions {
            extensions: owned(&EXTENSIONS),
            extension_alias: vec![
                (".js".to_owned(), owned(&[".ts", ".tsx", ".js"])),
                (".mjs".to_owned(), owned(&[".mts", ".mjs"])),
                (".cjs".to_owned(), owned(&[".cts", ".cjs"])),
            ],
            condition_names: owned(&CONDITIONS),
            builtin_modules: true,
            ..ResolveOptions::default()
        };
        Self {
            root: root.to_path_buf(),
            resolver: Resolver::new(options),
        }
    }

    fn relative(&self, resolved: &Path) -> Option<String> {
        let relative = resolved.strip_prefix(&self.root).ok()?;
        let text = relative.to_str()?.replace('\\', "/");
        (!text.split('/').any(|part| part == "node_modules")).then_some(text)
    }

    #[must_use]
    pub fn edges(&self, path: &str, text: &str) -> Vec<Edge> {
        let file = self.root.join(path);
        let Some(directory) = file.parent() else {
            return Vec::new();
        };
        let lines = Lines::new(text);
        requests(path, text)
            .into_iter()
            .filter_map(|request| {
                let resolved = self.resolver.resolve(directory, &request.specifier).ok()?;
                let target = self.relative(resolved.path())?;
                let (line, column) = lines.position(request.offset);
                Some(Edge {
                    from: path.to_owned(),
                    specifier: request.specifier,
                    target: Target::File(target),
                    line,
                    column,
                    wildcard: request.wildcard,
                })
            })
            .collect()
    }
}
