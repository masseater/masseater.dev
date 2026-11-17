use std::collections::{HashMap, HashSet};

use globset::GlobSet;

use crate::shared::config::{Config, Kind, Layers};
use crate::shared::glob;
use crate::shared::text::{inside, join, parent};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Instance {
    pub kind: usize,
    pub dir: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Position {
    Ignored,
    Outside,
    Root,
    Loose,
    UnknownLayer(String),
    Layer {
        layer: String,
        slice: Option<String>,
        inner: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Located {
    pub instance: usize,
    pub position: Position,
}

struct LayerGlobs {
    files: GlobSet,
    loose: GlobSet,
    entries: GlobSet,
    open: GlobSet,
}

pub struct Layout<'c> {
    pub config: &'c Config,
    pub instances: Vec<Instance>,
    pub list: Vec<String>,
    pub files: HashSet<String>,
    directories: HashSet<String>,
    entry_dirs: HashSet<String>,
    by_dir: HashMap<String, Vec<usize>>,
    globs: Vec<Option<LayerGlobs>>,
}

fn layer_globs(layers: &Layers) -> Result<LayerGlobs, String> {
    Ok(LayerGlobs {
        files: glob::set(&layers.files)?,
        loose: glob::set(&layers.loose)?,
        entries: glob::set(&layers.entries)?,
        open: glob::set(&layers.open)?,
    })
}

fn marker_dir<'a>(file: &'a str, marker: &str) -> Option<&'a str> {
    if file == marker {
        return Some("");
    }
    file.strip_suffix(marker)?.strip_suffix('/')
}

fn instances_of(index: usize, kind: &Kind, files: &[String]) -> Result<Vec<Instance>, String> {
    let paths = kind.paths.as_deref().map(glob::set).transpose()?;
    Ok(files
        .iter()
        .filter_map(|file| marker_dir(file, &kind.marker))
        .filter(|dir| {
            paths
                .as_ref()
                .is_none_or(|set| set.is_match(if dir.is_empty() { "." } else { dir }))
        })
        .map(|dir| Instance {
            kind: index,
            dir: dir.to_owned(),
        })
        .collect())
}

fn stem(name: &str) -> &str {
    name.split_once('.').map_or(name, |(head, _)| head)
}

impl<'c> Layout<'c> {
    pub fn new(config: &'c Config, files: Vec<String>) -> Result<Self, String> {
        let mut instances = Vec::new();
        for (index, kind) in config.kinds.iter().enumerate() {
            instances.extend(instances_of(index, kind, &files)?);
        }
        let mut by_dir: HashMap<String, Vec<usize>> = HashMap::new();
        for (index, instance) in instances.iter().enumerate() {
            by_dir.entry(instance.dir.clone()).or_default().push(index);
        }
        let globs = config
            .kinds
            .iter()
            .map(|kind| kind.layers.as_ref().map(layer_globs).transpose())
            .collect::<Result<Vec<_>, String>>()?;
        let mut entry_dirs = HashSet::new();
        for file in &files {
            let name = file.rsplit('/').next().unwrap_or(file);
            if globs
                .iter()
                .flatten()
                .any(|layer| layer.entries.is_match(name))
            {
                entry_dirs.insert(parent(file).to_owned());
            }
        }
        let mut directories = HashSet::new();
        for file in &files {
            let mut dir = parent(file);
            while !dir.is_empty() && directories.insert(dir.to_owned()) {
                dir = parent(dir);
            }
        }
        Ok(Self {
            config,
            instances,
            files: files.iter().cloned().collect(),
            list: files,
            directories,
            entry_dirs,
            by_dir,
            globs,
        })
    }

    #[must_use]
    pub fn exists(&self, path: &str) -> bool {
        path.is_empty() || self.files.contains(path) || self.directories.contains(path)
    }

    #[must_use]
    pub fn owners(&self, file: &str) -> &[usize] {
        let mut dir = parent(file);
        loop {
            if let Some(found) = self.by_dir.get(dir) {
                return found;
            }
            if dir.is_empty() {
                return &[];
            }
            dir = parent(dir);
        }
    }

    #[must_use]
    pub fn kind(&self, instance: usize) -> &Kind {
        &self.config.kinds[self.instances[instance].kind]
    }

    #[must_use]
    pub fn inner<'p>(&self, instance: usize, path: &'p str) -> Option<&'p str> {
        inside(path, &self.instances[instance].dir)
    }

    #[must_use]
    pub fn is_entry(&self, instance: usize, inner: &str) -> bool {
        self.globs[self.instances[instance].kind]
            .as_ref()
            .is_some_and(|globs| globs.entries.is_match(inner))
    }

    #[must_use]
    pub fn is_open(&self, instance: usize, rest: &str) -> bool {
        self.globs[self.instances[instance].kind]
            .as_ref()
            .is_some_and(|globs| globs.open.is_match(rest))
    }

    #[must_use]
    pub fn locate(&self, instance: usize, path: &str) -> Position {
        let kind = self.kind(instance);
        let (Some(layers), Some(globs)) =
            (&kind.layers, &self.globs[self.instances[instance].kind])
        else {
            return Position::Ignored;
        };
        let Some(inner) = self.inner(instance, path) else {
            return Position::Ignored;
        };
        if !globs.files.is_match(inner) {
            return Position::Ignored;
        }
        let Some(rest) = inside(inner, &layers.dir) else {
            return Position::Outside;
        };
        let base = join(&self.instances[instance].dir, &layers.dir);
        let is_slice = |sub: &str| self.entry_dirs.contains(&join(&base, sub));
        locate_rest(layers, globs, rest, &is_slice)
    }

    pub fn located(&self, path: &str) -> Vec<Located> {
        self.owners(path)
            .iter()
            .map(|&instance| Located {
                instance,
                position: self.locate(instance, path),
            })
            .collect()
    }
}

fn slice_of(layer: &str, tail: &[&str], is_slice: &dyn Fn(&str) -> bool) -> (String, String) {
    for end in 1..tail.len() {
        let slice = tail[..end].join("/");
        if is_slice(&format!("{layer}/{slice}")) {
            return (slice, tail[end..].join("/"));
        }
    }
    (tail[0].to_owned(), tail[1..].join("/"))
}

fn locate_rest(
    layers: &Layers,
    globs: &LayerGlobs,
    rest: &str,
    is_slice: &dyn Fn(&str) -> bool,
) -> Position {
    let segments: Vec<&str> = rest.split('/').collect();
    let has = |list: &[String], name: &str| list.iter().any(|item| item == name);
    match segments.as_slice() {
        [single] => {
            if globs.loose.is_match(rest) {
                Position::Root
            } else if layers.module_files && has(&layers.order, stem(single)) {
                Position::Layer {
                    layer: stem(single).to_owned(),
                    slice: None,
                    inner: None,
                }
            } else if layers.module_files {
                Position::UnknownLayer(stem(single).to_owned())
            } else {
                Position::Loose
            }
        }
        [layer, tail @ ..] => {
            if !has(&layers.order, layer) {
                return Position::UnknownLayer((*layer).to_owned());
            }
            let parted = has(&layers.sliced, layer) || has(&layers.segmented, layer);
            let (slice, inner) = match tail {
                [only] if parted && layers.module_files => (Some(stem(only).to_owned()), None),
                [only] if parted => (Some(stem(only).to_owned()), Some((*only).to_owned())),
                [_, _, ..] if parted && layers.module_files => {
                    (Some(tail[0].to_owned()), Some(tail[1..].join("/")))
                }
                [_, _, ..] if parted => {
                    let (slice, inner) = slice_of(layer, tail, is_slice);
                    (Some(slice), Some(inner))
                }
                _ => (None, None),
            };
            Position::Layer {
                layer: (*layer).to_owned(),
                slice,
                inner,
            }
        }
        [] => Position::Loose,
    }
}

#[cfg(test)]
mod tests {
    use super::{Layout, Position};
    use crate::shared::fixture::{config, files};

    const FILES: [&str; 12] = [
        "package.json",
        "src/app/index.ts",
        "libs/kit/package.json",
        "libs/kit/src/features/auth/login/index.ts",
        "libs/kit/src/features/auth/login/model/run.ts",
        "libs/kit/src/entities/job/index.ts",
        "libs/kit/src/shared/lib/text.ts",
        "libs/kit/native/Cargo.toml",
        "libs/kit/native/src/lib.rs",
        "libs/kit/native/src/features/sync_notes/mod.rs",
        "libs/kit/native/src/shared/text.rs",
        "skills/write/SKILL.md",
    ];

    fn layer(layer: &str, slice: Option<&str>, inner: Option<&str>) -> Position {
        Position::Layer {
            layer: layer.to_owned(),
            slice: slice.map(str::to_owned),
            inner: inner.map(str::to_owned),
        }
    }

    fn positions(path: &str) -> Vec<(String, Position)> {
        let config = config();
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        layout
            .located(path)
            .into_iter()
            .map(|located| {
                (
                    layout.instances[located.instance].dir.clone(),
                    located.position,
                )
            })
            .collect()
    }

    #[test]
    fn finds_markers_at_the_root_and_in_nested_directories() {
        let config = config();
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        let dirs: Vec<(&str, &str)> = layout
            .instances
            .iter()
            .map(|instance| {
                (
                    config.kinds[instance.kind].name.as_str(),
                    instance.dir.as_str(),
                )
            })
            .collect();
        assert_eq!(
            dirs,
            vec![
                ("workspace", ""),
                ("workspace", "libs/kit"),
                ("crate", "libs/kit/native"),
                ("skill", "skills/write"),
            ]
        );
    }

    #[test]
    fn places_files_in_layers_slices_and_segments() {
        assert_eq!(
            positions("src/app/index.ts"),
            vec![(String::new(), layer("app", None, None))]
        );
        assert_eq!(
            positions("libs/kit/src/entities/job/index.ts"),
            vec![(
                "libs/kit".to_owned(),
                layer("entities", Some("job"), Some("index.ts"))
            )]
        );
        assert_eq!(
            positions("libs/kit/src/shared/lib/text.ts"),
            vec![(
                "libs/kit".to_owned(),
                layer("shared", Some("lib"), Some("text.ts"))
            )]
        );
    }

    #[test]
    fn treats_a_directory_with_an_entry_file_as_a_grouped_slice() {
        assert_eq!(
            positions("libs/kit/src/features/auth/login/model/run.ts"),
            vec![(
                "libs/kit".to_owned(),
                layer("features", Some("auth/login"), Some("model/run.ts"))
            )]
        );
    }

    #[test]
    fn places_rust_modules_by_file_and_directory() {
        assert_eq!(
            positions("libs/kit/native/src/lib.rs"),
            vec![("libs/kit/native".to_owned(), Position::Root)]
        );
        assert_eq!(
            positions("libs/kit/native/src/features/sync_notes/mod.rs"),
            vec![(
                "libs/kit/native".to_owned(),
                layer("features", Some("sync_notes"), Some("mod.rs"))
            )]
        );
        assert_eq!(
            positions("libs/kit/native/src/shared/text.rs"),
            vec![(
                "libs/kit/native".to_owned(),
                layer("shared", Some("text"), None)
            )]
        );
        assert_eq!(
            positions("libs/kit/native/src/features.rs"),
            vec![("libs/kit/native".to_owned(), layer("features", None, None))]
        );
        assert_eq!(
            positions("libs/kit/native/src/util.rs"),
            vec![(
                "libs/kit/native".to_owned(),
                Position::UnknownLayer("util".to_owned())
            )]
        );
    }

    #[test]
    fn tells_loose_outside_and_ignored_files_apart() {
        assert_eq!(
            positions("libs/kit/src/index.ts"),
            vec![("libs/kit".to_owned(), Position::Loose)]
        );
        assert_eq!(
            positions("libs/kit/src/utils/a.ts"),
            vec![(
                "libs/kit".to_owned(),
                Position::UnknownLayer("utils".to_owned())
            )]
        );
        assert_eq!(
            positions("libs/kit/bin/kit.ts"),
            vec![("libs/kit".to_owned(), Position::Outside)]
        );
        assert_eq!(
            positions("libs/kit/README.md"),
            vec![("libs/kit".to_owned(), Position::Ignored)]
        );
        assert_eq!(
            positions("skills/write/SKILL.md"),
            vec![("skills/write".to_owned(), Position::Ignored)]
        );
    }

    #[test]
    fn limits_a_kind_to_its_paths() {
        let mut config = config();
        config.kinds[0].paths = Some(vec!["libs/*".to_owned()]);
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        let dirs: Vec<&str> = layout
            .instances
            .iter()
            .filter(|instance| instance.kind == 0)
            .map(|instance| instance.dir.as_str())
            .collect();
        assert_eq!(dirs, vec!["libs/kit"]);
        assert_eq!(layout.located("src/app/index.ts").len(), 0);
    }

    #[test]
    fn knows_which_files_and_directories_exist() {
        let config = config();
        let layout = Layout::new(&config, files(&FILES)).expect("the layout builds");
        assert!(layout.exists("libs/kit/src/entities/job/index.ts"));
        assert!(layout.exists("libs/kit/src/entities"));
        assert!(layout.exists(""));
        assert!(!layout.exists("libs/kit/src/entities/user"));
    }

    #[test]
    fn rejects_an_invalid_glob() {
        let mut config = config();
        config.kinds[0].paths = Some(vec!["libs/[".to_owned()]);
        assert!(Layout::new(&config, files(&FILES)).is_err());
    }
}
