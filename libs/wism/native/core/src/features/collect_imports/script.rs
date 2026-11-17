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
            let offset = request.span.start as usize;
            match found.iter_mut().find(|known| known.offset == offset) {
                Some(known) => known.wildcard = true,
                None => found.push(Request {
                    specifier: request.name.to_string(),
                    offset,
                    wildcard: true,
                }),
            }
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

#[cfg(test)]
mod tests {
    use super::Scripts;
    use crate::entities::import::Target;
    use crate::shared::fixture::Tree;

    const SOURCE: &str = "import a from \"./a.ts\";
import type { B } from \"./b.js\";
export * from \"./c.ts\";
export { d } from \"./d\";
import fs from \"node:fs\";
import pkg from \"pkg\";
import \"./missing.ts\";
import { inner } from \"#/shared/inner.ts\";
const e = await import(\"./e.ts\");
const f = await import(`./f${a}.ts`);
";

    fn tree() -> Tree {
        Tree::new(&[
            (
                "kit/package.json",
                r##"{ "imports": { "#/*": "./src/*" } }"##,
            ),
            ("kit/src/index.ts", SOURCE),
            ("kit/src/a.ts", ""),
            ("kit/src/b.ts", ""),
            ("kit/src/c.ts", ""),
            ("kit/src/d.ts", ""),
            ("kit/src/e.ts", ""),
            ("kit/src/shared/inner.ts", ""),
            (
                "kit/node_modules/pkg/package.json",
                r#"{ "name": "pkg", "main": "index.js" }"#,
            ),
            ("kit/node_modules/pkg/index.js", ""),
        ])
    }

    #[test]
    fn resolves_static_dynamic_and_subpath_imports_to_repository_files() {
        let tree = tree();
        let found: Vec<(String, usize, usize, bool)> = Scripts::new(&tree.root)
            .edges("kit/src/index.ts", SOURCE)
            .into_iter()
            .map(|edge| match edge.target {
                Target::File(path) => (path, edge.line, edge.column, edge.wildcard),
                Target::Module(path) => (path.join("::"), edge.line, edge.column, edge.wildcard),
            })
            .collect();
        assert_eq!(
            found,
            vec![
                ("kit/src/a.ts".to_owned(), 1, 15, false),
                ("kit/src/b.ts".to_owned(), 2, 24, false),
                ("kit/src/c.ts".to_owned(), 3, 15, true),
                ("kit/src/d.ts".to_owned(), 4, 19, false),
                ("kit/src/shared/inner.ts".to_owned(), 8, 23, false),
                ("kit/src/e.ts".to_owned(), 9, 24, false),
            ]
        );
    }

    #[test]
    fn keeps_the_written_specifier() {
        let tree = tree();
        let specifiers: Vec<String> = Scripts::new(&tree.root)
            .edges("kit/src/index.ts", SOURCE)
            .into_iter()
            .map(|edge| edge.specifier)
            .collect();
        assert_eq!(
            specifiers,
            vec![
                "./a.ts",
                "./b.js",
                "./c.ts",
                "./d",
                "#/shared/inner.ts",
                "./e.ts"
            ]
        );
    }

    #[test]
    fn parses_tsx_and_ignores_files_that_do_not_parse() {
        let tree = Tree::new(&[("app/view.tsx", ""), ("app/a.ts", "")]);
        let scripts = Scripts::new(&tree.root);
        let tsx = scripts.edges(
            "app/view.tsx",
            "import a from \"./a.ts\";\nexport const View = () => <div>{a}</div>;\n",
        );
        assert_eq!(tsx.len(), 1);
        assert_eq!(scripts.edges("app/view.tsx", "import {{{").len(), 0);
    }
}
