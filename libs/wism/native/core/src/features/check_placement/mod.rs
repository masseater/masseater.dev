use std::collections::BTreeSet;

use crate::entities::layout::{Layout, Position};
use crate::shared::diagnostic::Finding;
use crate::shared::glob;
use crate::shared::text::{inside, join};

pub const PLACEMENT: &str = "placement";
pub const LOOSE_FILE: &str = "loose-file";
pub const LAYER_NAME: &str = "layer-name";

struct Compiled {
    files: globset::GlobSet,
    allow: globset::GlobSet,
    message: String,
}

fn compile(layout: &Layout) -> Result<Vec<Vec<Compiled>>, String> {
    layout
        .config
        .kinds
        .iter()
        .map(|kind| {
            kind.placements
                .iter()
                .map(|placement| {
                    Ok(Compiled {
                        files: glob::set(&placement.files)?,
                        allow: glob::set(&placement.allow)?,
                        message: placement.message.clone().unwrap_or_else(|| {
                            format!("is not a place a {} allows for this file.", kind.name)
                        }),
                    })
                })
                .collect()
        })
        .collect()
}

fn layer_message(layout: &Layout, instance: usize) -> String {
    let order = layout
        .kind(instance)
        .layers
        .as_ref()
        .map_or_default(|layers| layers.order.join(", "));
    format!("is not a layer. Use one of {order}.")
}

fn loose_message(layout: &Layout, instance: usize) -> String {
    let dir = layout
        .kind(instance)
        .layers
        .as_ref()
        .map_or_default(|layers| layers.dir.clone());
    format!("sits directly in {dir}/. Put it in a layer.")
}

pub fn check(layout: &Layout, files: &[String]) -> Result<Vec<Finding>, String> {
    let compiled = compile(layout)?;
    let mut found: BTreeSet<(String, &'static str, String)> = BTreeSet::new();
    for path in files {
        for located in layout.located(path) {
            let instance = located.instance;
            let kind = layout.instances[instance].kind;
            let Some(inner) = layout.inner(instance, path) else {
                continue;
            };
            for placement in &compiled[kind] {
                if placement.files.is_match(inner) && !placement.allow.is_match(inner) {
                    found.insert((path.clone(), PLACEMENT, placement.message.clone()));
                }
            }
            match located.position {
                Position::Loose => {
                    found.insert((path.clone(), LOOSE_FILE, loose_message(layout, instance)));
                }
                Position::UnknownLayer(layer) => {
                    let dir = layout
                        .kind(instance)
                        .layers
                        .as_ref()
                        .map_or_default(|layers| layers.dir.clone());
                    let base = join(&layout.instances[instance].dir, &join(&dir, &layer));
                    let reported = inside(path, &base).map_or_else(|| path.clone(), |_| base);
                    found.insert((reported, LAYER_NAME, layer_message(layout, instance)));
                }
                _ => {}
            }
        }
    }
    Ok(found
        .into_iter()
        .map(|(path, rule, message)| Finding::at_file(&path, rule, message))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::{LAYER_NAME, LOOSE_FILE, PLACEMENT, check};
    use crate::entities::layout::Layout;
    use crate::shared::fixture::{config, files};

    fn found(names: &[&str]) -> Vec<(String, &'static str)> {
        let config = config();
        let list = files(names);
        let layout = Layout::new(&config, list.clone()).expect("the layout builds");
        check(&layout, &list)
            .expect("the placements compile")
            .into_iter()
            .map(|finding| (finding.path, finding.rule))
            .collect()
    }

    #[test]
    fn accepts_layered_workspaces_and_crates() {
        let found = found(&[
            "libs/kit/package.json",
            "libs/kit/vite.config.ts",
            "libs/kit/bin/kit.ts",
            "libs/kit/src/app/index.ts",
            "libs/kit/src/features/run-kit/index.ts",
            "libs/kit/src/shared/lib/text.ts",
            "crates/core/Cargo.toml",
            "crates/core/build.rs",
            "crates/core/src/lib.rs",
            "crates/core/src/features.rs",
            "crates/core/src/features/sync_notes/mod.rs",
            "skills/write/SKILL.md",
            "skills/write/references/style.md",
        ]);
        assert_eq!(found, Vec::new());
    }

    #[test]
    fn reports_files_outside_the_layout() {
        let found = found(&[
            "libs/kit/package.json",
            "libs/kit/kit.ts",
            "libs/kit/src/index.ts",
            "libs/kit/src/utils/a.ts",
            "libs/kit/src/utils/b.ts",
            "crates/core/Cargo.toml",
            "crates/core/conformance/lib.rs",
            "crates/core/src/utils.rs",
            "skills/write/SKILL.md",
            "skills/write/notes.txt",
        ]);
        assert_eq!(
            found,
            vec![
                ("crates/core/conformance/lib.rs".to_owned(), PLACEMENT),
                ("crates/core/src/utils.rs".to_owned(), LAYER_NAME),
                ("libs/kit/kit.ts".to_owned(), PLACEMENT),
                ("libs/kit/src/index.ts".to_owned(), LOOSE_FILE),
                ("libs/kit/src/utils".to_owned(), LAYER_NAME),
                ("skills/write/notes.txt".to_owned(), PLACEMENT),
            ]
        );
    }

    #[test]
    fn gives_each_file_to_the_innermost_marker() {
        let found = found(&[
            "libs/kit/package.json",
            "libs/kit/src/app/index.ts",
            "libs/kit/native/Cargo.toml",
            "libs/kit/native/src/lib.rs",
        ]);
        assert_eq!(found, Vec::new());
    }
}
