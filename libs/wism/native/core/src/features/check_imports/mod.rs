use crate::entities::import::{Edge, Target};
use crate::entities::layout::{Layout, Position};
use crate::shared::config::Layers;
use crate::shared::diagnostic::Finding;
use crate::shared::text::{has_extension, inside};

pub const LAYER_IMPORT: &str = "layer-import";
pub const CROSS_SLICE: &str = "cross-slice";
pub const PUBLIC_API: &str = "public-api";
pub const WILDCARD_EXPORT: &str = "wildcard-export";
pub const LINK_TARGET: &str = "link-target";
const MARKDOWN: &str = "md";

struct Spot<'a> {
    layer: &'a str,
    slice: Option<&'a str>,
    inner: Option<&'a str>,
}

fn crossing(layers: &Layers, source: &Spot, target: &Spot) -> bool {
    let (Some(cross), Some(own), Some(inner)) = (&layers.cross, source.slice, target.inner) else {
        return false;
    };
    let name = own.rsplit('/').next().unwrap_or(own);
    inner
        .strip_prefix(cross.as_str())
        .and_then(|rest| rest.strip_prefix('/'))
        .and_then(|rest| rest.strip_prefix(name))
        .is_some_and(|rest| rest.is_empty() || rest.starts_with('.'))
}

fn rank(layers: &Layers, layer: &str) -> Option<usize> {
    layers.order.iter().position(|name| name == layer)
}

fn is_parted(layers: &Layers, layer: &str) -> bool {
    layers.sliced.iter().any(|name| name == layer)
        || layers.segmented.iter().any(|name| name == layer)
}

fn finding(edge: &Edge, rule: &'static str, message: String) -> Finding {
    Finding {
        path: edge.from.clone(),
        line: edge.line,
        column: edge.column,
        rule,
        message,
    }
}

fn direction(layers: &Layers, edge: &Edge, source: &Spot, target: &Spot) -> Option<Finding> {
    let (Some(from), Some(to)) = (rank(layers, source.layer), rank(layers, target.layer)) else {
        return None;
    };
    if to < from {
        return Some(finding(
            edge,
            LAYER_IMPORT,
            format!(
                "uses the {} layer from the {} layer ({}). A layer may only use the layers below it: {}.",
                target.layer,
                source.layer,
                edge.specifier,
                layers.order.join(", ")
            ),
        ));
    }
    let sliced = layers.sliced.iter().any(|name| name == target.layer);
    if to == from
        && sliced
        && let (Some(own), Some(other)) = (source.slice, target.slice)
        && own != other
        && !crossing(layers, source, target)
    {
        return Some(finding(
            edge,
            CROSS_SLICE,
            format!(
                "uses the {} slice {other} from the slice {own} ({}). Slices of one layer must not use each other; move what they share down a layer.",
                target.layer, edge.specifier
            ),
        ));
    }
    None
}

fn spot(position: &Position) -> Option<Spot<'_>> {
    match position {
        Position::Layer {
            layer,
            slice,
            inner,
        } => Some(Spot {
            layer,
            slice: slice.as_deref(),
            inner: inner.as_deref(),
        }),
        _ => None,
    }
}

fn file_findings(layout: &Layout, edge: &Edge, target: &str, out: &mut Vec<Finding>) {
    for source in layout.located(&edge.from) {
        let instance = source.instance;
        let Some(layers) = &layout.kind(instance).layers else {
            continue;
        };
        let Some(from) = spot(&source.position) else {
            continue;
        };
        if edge.wildcard
            && let Position::Layer {
                inner: Some(inner), ..
            } = &source.position
            && layout.is_entry(instance, inner)
        {
            out.push(finding(
                edge,
                WILDCARD_EXPORT,
                format!(
                    "re-exports everything from {}. Name what the public API exports.",
                    edge.specifier
                ),
            ));
        }
        if !layout.owners(target).contains(&instance) {
            continue;
        }
        let position = layout.locate(instance, target);
        let Some(to) = spot(&position) else {
            continue;
        };
        if let Some(found) = direction(layers, edge, &from, &to) {
            out.push(found);
            continue;
        }
        let same = from.layer == to.layer && from.slice == to.slice;
        let rest = layout
            .inner(instance, target)
            .and_then(|inner| inside(inner, &layers.dir))
            .unwrap_or_default();
        if let (
            Position::Layer {
                slice: Some(slice),
                inner: Some(inner),
                ..
            },
            false,
        ) = (&position, same)
            && is_parted(layers, to.layer)
            && !layout.is_entry(instance, inner)
            && !crossing(layers, &from, &to)
            && !layout.is_open(instance, rest)
        {
            out.push(finding(
                edge,
                PUBLIC_API,
                format!(
                    "reaches into {}/{slice} past its public API ({}). Import the slice's entry file instead.",
                    to.layer, edge.specifier
                ),
            ));
        }
    }
}

fn module_findings(layout: &Layout, edge: &Edge, target: &[String], out: &mut Vec<Finding>) {
    for source in layout.located(&edge.from) {
        let Some(layers) = &layout.kind(source.instance).layers else {
            continue;
        };
        let Some(from) = spot(&source.position) else {
            continue;
        };
        let Some(layer) = target.first() else {
            continue;
        };
        if rank(layers, layer).is_none() || target.len() < 2 {
            continue;
        }
        let to = Spot {
            layer,
            slice: is_parted(layers, layer)
                .then(|| target.get(1).map(String::as_str))
                .flatten(),
            inner: None,
        };
        if let Some(found) = direction(layers, edge, &from, &to) {
            out.push(found);
        }
    }
}

#[must_use]
pub fn check(layout: &Layout, edges: &[Edge]) -> Vec<Finding> {
    let mut out = Vec::new();
    for edge in edges {
        match &edge.target {
            Target::File(target) if has_extension(&edge.from, &[MARKDOWN]) => {
                if !layout.exists(target) {
                    out.push(finding(
                        edge,
                        LINK_TARGET,
                        format!("links to {}, where no file is tracked.", edge.specifier),
                    ));
                }
            }
            Target::File(target) => file_findings(layout, edge, target, &mut out),
            Target::Module(target) => module_findings(layout, edge, target, &mut out),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{CROSS_SLICE, LAYER_IMPORT, LINK_TARGET, PUBLIC_API, WILDCARD_EXPORT, check};
    use crate::entities::import::{Edge, Target};
    use crate::entities::layout::Layout;
    use crate::shared::fixture::{config, files};

    const FILES: [&str; 17] = [
        "libs/kit/package.json",
        "libs/kit/README.md",
        "libs/kit/src/app/index.ts",
        "libs/kit/src/features/run-kit/index.ts",
        "libs/kit/src/features/run-kit/model/run.ts",
        "libs/kit/src/features/read-kit/index.ts",
        "libs/kit/src/entities/job/index.ts",
        "libs/kit/src/entities/job/model/job.ts",
        "libs/kit/src/entities/job/@x/user.ts",
        "libs/kit/src/entities/user/index.ts",
        "libs/kit/src/shared/lib/text.ts",
        "libs/kit/src/shared/config/types.ts",
        "libs/kit/CHANGELOG.md",
        "crates/core/Cargo.toml",
        "crates/core/src/features/sync_notes/mod.rs",
        "crates/core/src/entities/note.rs",
        "crates/core/src/features/read_notes/mod.rs",
    ];

    fn edge(from: &str, target: Target) -> Edge {
        Edge {
            from: from.to_owned(),
            specifier: from.to_owned(),
            target,
            line: 1,
            column: 1,
            wildcard: false,
        }
    }

    fn file(from: &str, to: &str) -> Edge {
        edge(from, Target::File(to.to_owned()))
    }

    fn module(from: &str, to: &[&str]) -> Edge {
        edge(from, Target::Module(files(to)))
    }

    fn rules(edges: &[Edge]) -> Vec<&'static str> {
        let config = config();
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        check(&layout, edges)
            .into_iter()
            .map(|finding| finding.rule)
            .collect()
    }

    #[test]
    fn accepts_imports_down_the_layers_through_public_apis() {
        let found = rules(&[
            file(
                "libs/kit/src/app/index.ts",
                "libs/kit/src/features/run-kit/index.ts",
            ),
            file(
                "libs/kit/src/features/run-kit/model/run.ts",
                "libs/kit/src/entities/job/index.ts",
            ),
            file(
                "libs/kit/src/features/run-kit/index.ts",
                "libs/kit/src/features/run-kit/model/run.ts",
            ),
            file(
                "libs/kit/src/entities/user/index.ts",
                "libs/kit/src/entities/job/@x/user.ts",
            ),
            file(
                "libs/kit/src/entities/job/model/job.ts",
                "libs/kit/src/shared/lib/text.ts",
            ),
            file("libs/kit/README.md", "libs/kit/src/app/index.ts"),
            module(
                "crates/core/src/features/sync_notes/mod.rs",
                &["entities", "note", "Note"],
            ),
        ]);
        assert_eq!(found, Vec::<&str>::new());
    }

    #[test]
    fn reports_imports_against_the_layers() {
        let mut wildcard = file(
            "libs/kit/src/entities/job/index.ts",
            "libs/kit/src/entities/job/model/job.ts",
        );
        wildcard.wildcard = true;
        let found = rules(&[
            file(
                "libs/kit/src/entities/job/model/job.ts",
                "libs/kit/src/features/run-kit/index.ts",
            ),
            file(
                "libs/kit/src/features/run-kit/model/run.ts",
                "libs/kit/src/features/read-kit/index.ts",
            ),
            file(
                "libs/kit/src/app/index.ts",
                "libs/kit/src/entities/job/model/job.ts",
            ),
            wildcard,
            file("libs/kit/README.md", "libs/kit/docs/missing.md"),
            module(
                "crates/core/src/entities/note.rs",
                &["features", "sync_notes", "sync"],
            ),
        ]);
        assert_eq!(
            found,
            vec![
                LAYER_IMPORT,
                CROSS_SLICE,
                PUBLIC_API,
                WILDCARD_EXPORT,
                LINK_TARGET,
                LAYER_IMPORT
            ]
        );
    }
    #[test]
    fn allows_cross_imports_only_through_the_matching_x_file() {
        let found = rules(&[
            file(
                "libs/kit/src/entities/user/index.ts",
                "libs/kit/src/entities/job/@x/user.ts",
            ),
            file(
                "libs/kit/src/features/run-kit/model/run.ts",
                "libs/kit/src/entities/job/@x/user.ts",
            ),
        ]);
        assert_eq!(found, vec![PUBLIC_API]);
    }

    #[test]
    fn reports_slices_of_one_layer_that_use_each_other() {
        let found = rules(&[file(
            "libs/kit/src/features/read-kit/index.ts",
            "libs/kit/src/features/run-kit/index.ts",
        )]);
        assert_eq!(found, vec![CROSS_SLICE]);
    }

    #[test]
    fn lets_open_segments_be_imported_past_their_entry() {
        let found = rules(&[
            file(
                "libs/kit/src/entities/user/index.ts",
                "libs/kit/src/shared/lib/text.ts",
            ),
            file(
                "libs/kit/src/entities/user/index.ts",
                "libs/kit/src/shared/config/types.ts",
            ),
        ]);
        assert_eq!(found, vec![PUBLIC_API]);
    }

    #[test]
    fn reports_wildcard_exports_only_in_entry_files() {
        let mut entry = file(
            "libs/kit/src/entities/job/index.ts",
            "libs/kit/src/entities/job/model/job.ts",
        );
        entry.wildcard = true;
        let mut inner = file(
            "libs/kit/src/entities/job/model/job.ts",
            "libs/kit/src/shared/lib/text.ts",
        );
        inner.wildcard = true;
        assert_eq!(rules(&[entry, inner]), vec![WILDCARD_EXPORT]);
    }

    #[test]
    fn checks_markdown_links_against_files_and_directories() {
        let found = rules(&[
            file("libs/kit/README.md", "libs/kit/src"),
            file("libs/kit/README.md", "libs/kit/src/entities/job/index.ts"),
            file("libs/kit/README.md", "libs/kit/CHANGELOG.md"),
            file("libs/kit/README.md", "../outside.md"),
        ]);
        assert_eq!(found, vec![LINK_TARGET]);
    }

    #[test]
    fn ignores_imports_that_leave_the_instance() {
        let found = rules(&[file(
            "libs/kit/src/entities/job/model/job.ts",
            "crates/core/src/features/sync_notes/mod.rs",
        )]);
        assert_eq!(found, Vec::<&str>::new());
    }

    #[test]
    fn checks_rust_paths_between_slices_and_layers() {
        let found = rules(&[
            module(
                "crates/core/src/features/sync_notes/mod.rs",
                &["features", "read_notes", "read"],
            ),
            module(
                "crates/core/src/features/sync_notes/mod.rs",
                &["features", "sync_notes", "inner"],
            ),
            module("crates/core/src/entities/note.rs", &["app", "run"]),
            module("crates/core/src/entities/note.rs", &["std"]),
            module("crates/core/src/entities/note.rs", &["helpers", "run"]),
        ]);
        assert_eq!(found, vec![CROSS_SLICE, LAYER_IMPORT]);
    }

    #[test]
    fn reports_where_the_import_is_written() {
        let config = config();
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        let mut upward = file(
            "libs/kit/src/entities/job/model/job.ts",
            "libs/kit/src/app/index.ts",
        );
        upward.line = 7;
        upward.column = 21;
        upward.specifier = "#/app/index.ts".to_owned();
        let found = check(&layout, &[upward]);
        assert_eq!(found.len(), 1);
        assert_eq!(
            (found[0].path.as_str(), found[0].line, found[0].column),
            ("libs/kit/src/entities/job/model/job.ts", 7, 21)
        );
        assert!(found[0].message.contains("#/app/index.ts"));
        assert!(found[0].message.contains("app"));
    }
}
