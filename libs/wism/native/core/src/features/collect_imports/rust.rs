use syn::visit::Visit;

use crate::entities::import::{Edge, Target};

const ROOTS: [&str; 2] = ["lib", "main"];
const BINARIES: &str = "bin";
const MODULE_INDEX: &str = "mod";

#[must_use]
pub fn module_of(rest: &str) -> Vec<String> {
    let trimmed = rest.strip_suffix(".rs").unwrap_or(rest);
    let mut parts: Vec<String> = trimmed.split('/').map(str::to_owned).collect();
    if parts.first().is_some_and(|first| first == BINARIES) {
        return Vec::new();
    }
    if parts.len() == 1 && ROOTS.contains(&parts[0].as_str()) {
        return Vec::new();
    }
    if parts.last().is_some_and(|last| last == MODULE_INDEX) {
        parts.pop();
    }
    parts
}

fn resolve(segments: &[String], current: &[String]) -> Option<Vec<String>> {
    let (first, rest) = segments.split_first()?;
    match first.as_str() {
        "crate" => Some(rest.to_vec()),
        "self" => Some([current, rest].concat()),
        "super" => {
            let (_, parent) = current.split_last()?;
            if rest.first().is_some_and(|next| next == "super") {
                resolve(rest, parent)
            } else {
                Some([parent, rest].concat())
            }
        }
        _ => None,
    }
}

struct Uses<'a> {
    path: &'a str,
    current: Vec<String>,
    found: Vec<Edge>,
}

impl Uses<'_> {
    fn record(&mut self, segments: &[String], span: proc_macro2::Span) {
        let Some(target) = resolve(segments, &self.current) else {
            return;
        };
        let start = span.start();
        self.found.push(Edge {
            from: self.path.to_owned(),
            specifier: segments.join("::"),
            target: Target::Module(target),
            line: start.line,
            column: start.column + 1,
            wildcard: false,
        });
    }

    fn walk(&mut self, tree: &syn::UseTree, prefix: &mut Vec<String>, span: proc_macro2::Span) {
        match tree {
            syn::UseTree::Path(path) => {
                prefix.push(path.ident.to_string());
                self.walk(&path.tree, prefix, span);
                prefix.pop();
            }
            syn::UseTree::Name(name) => {
                prefix.push(name.ident.to_string());
                self.record(&prefix.clone(), span);
                prefix.pop();
            }
            syn::UseTree::Rename(rename) => {
                prefix.push(rename.ident.to_string());
                self.record(&prefix.clone(), span);
                prefix.pop();
            }
            syn::UseTree::Glob(_) => self.record(&prefix.clone(), span),
            syn::UseTree::Group(group) => {
                for item in &group.items {
                    self.walk(item, prefix, span);
                }
            }
        }
    }
}

fn first_span(tree: &syn::UseTree) -> proc_macro2::Span {
    match tree {
        syn::UseTree::Path(path) => path.ident.span(),
        syn::UseTree::Name(name) => name.ident.span(),
        syn::UseTree::Rename(rename) => rename.ident.span(),
        syn::UseTree::Glob(glob) => glob.star_token.spans[0],
        syn::UseTree::Group(group) => group.brace_token.span.open(),
    }
}

fn macro_paths(
    tokens: proc_macro2::TokenStream,
    found: &mut Vec<(Vec<String>, proc_macro2::Span)>,
) {
    let trees: Vec<proc_macro2::TokenTree> = tokens.into_iter().collect();
    let mut index = 0;
    while index < trees.len() {
        if let proc_macro2::TokenTree::Group(group) = &trees[index] {
            macro_paths(group.stream(), found);
            index += 1;
            continue;
        }
        let (segments, next) = path_at(&trees, index);
        if segments.len() > 1 {
            found.push((segments, trees[index].span()));
            index = next;
        } else {
            index += 1;
        }
    }
}

fn path_at(trees: &[proc_macro2::TokenTree], start: usize) -> (Vec<String>, usize) {
    let mut segments = Vec::new();
    let mut index = start;
    while let Some(proc_macro2::TokenTree::Ident(ident)) = trees.get(index) {
        segments.push(ident.to_string());
        index += 1;
        let joined = matches!(
            (trees.get(index), trees.get(index + 1)),
            (Some(proc_macro2::TokenTree::Punct(first)), Some(proc_macro2::TokenTree::Punct(second)))
                if first.as_char() == ':' && second.as_char() == ':'
        );
        if !joined {
            break;
        }
        index += 2;
    }
    (segments, index.max(start + 1))
}

impl<'ast> Visit<'ast> for Uses<'_> {
    fn visit_item_use(&mut self, item: &'ast syn::ItemUse) {
        let span = first_span(&item.tree);
        self.walk(&item.tree, &mut Vec::new(), span);
    }

    fn visit_item_mod(&mut self, item: &'ast syn::ItemMod) {
        if item.content.is_some() {
            self.current.push(item.ident.to_string());
            syn::visit::visit_item_mod(self, item);
            self.current.pop();
        }
    }

    fn visit_macro(&mut self, mac: &'ast syn::Macro) {
        let mut found = Vec::new();
        macro_paths(mac.tokens.clone(), &mut found);
        for (segments, span) in found {
            self.record(&segments, span);
        }
        syn::visit::visit_macro(self, mac);
    }

    fn visit_path(&mut self, path: &'ast syn::Path) {
        if path.leading_colon.is_none()
            && path.segments.len() > 1
            && let Some(first) = path.segments.first()
        {
            let segments: Vec<String> = path
                .segments
                .iter()
                .map(|segment| segment.ident.to_string())
                .collect();
            self.record(&segments, first.ident.span());
        }
        syn::visit::visit_path(self, path);
    }
}

#[must_use]
pub fn uses(path: &str, text: &str, current: Vec<String>) -> Vec<Edge> {
    let Ok(file) = syn::parse_file(text) else {
        return Vec::new();
    };
    let mut visitor = Uses {
        path,
        current,
        found: Vec::new(),
    };
    visitor.visit_file(&file);
    visitor.found
}

#[cfg(test)]
mod tests {
    use super::{module_of, uses};
    use crate::entities::import::Target;

    fn targets(text: &str, current: &[&str]) -> Vec<Vec<String>> {
        let current = current.iter().map(|part| (*part).to_owned()).collect();
        uses("src/x.rs", text, current)
            .into_iter()
            .filter_map(|edge| match edge.target {
                Target::Module(path) => Some(path),
                Target::File(_) => None,
            })
            .collect()
    }

    #[test]
    fn maps_files_to_module_paths() {
        assert_eq!(module_of("lib.rs"), Vec::<String>::new());
        assert_eq!(module_of("bin/cli.rs"), Vec::<String>::new());
        assert_eq!(module_of("features/sync/mod.rs"), vec!["features", "sync"]);
        assert_eq!(module_of("entities/note.rs"), vec!["entities", "note"]);
    }

    #[test]
    fn resolves_crate_self_and_super_paths() {
        let found = targets(
            "use crate::{entities::note, shared::lib};\nuse super::super::entities::folder::Folder;\nfn run() { self::inner::go(); }\n",
            &["features", "sync"],
        );
        assert_eq!(
            found,
            vec![
                vec!["entities", "note"],
                vec!["shared", "lib"],
                vec!["entities", "folder", "Folder"],
                vec!["features", "sync", "inner", "go"],
            ]
        );
    }

    #[test]
    fn reads_paths_inside_macros_and_inline_modules() {
        let found = targets(
            "mod inner { fn a() { log!(super::super::features::read::go()); } }\n",
            &["entities", "note"],
        );
        assert_eq!(found, vec![vec!["entities", "features", "read", "go"]]);
    }
    #[test]
    fn reads_renames_globs_and_skips_external_paths() {
        let found = targets(
            "use crate::shared::text as t;\nuse crate::entities::*;\nuse ::std::fmt;\nuse std::io::Read;\nfn f() { let _ = core::mem::take(&mut 1); }\n",
            &["features", "sync"],
        );
        assert_eq!(found, vec![vec!["shared", "text"], vec!["entities"]]);
    }

    #[test]
    fn reports_the_position_of_each_path() {
        let edges = uses(
            "src/features/sync/mod.rs",
            "fn a() {}\n  use crate::entities::note;\n",
            vec!["features".to_owned(), "sync".to_owned()],
        );
        assert_eq!(edges.len(), 1);
        assert_eq!((edges[0].line, edges[0].column), (2, 7));
        assert_eq!(edges[0].specifier, "crate::entities::note");
    }

    #[test]
    fn returns_nothing_for_a_file_that_does_not_parse() {
        assert_eq!(targets("fn (", &[]).len(), 0);
    }

    #[test]
    fn stops_at_super_above_the_crate_root() {
        assert_eq!(targets("use super::x;\n", &[]).len(), 0);
    }
}
