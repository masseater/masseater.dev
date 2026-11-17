mod decode;
mod popular;

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub use popular::{is_outdated, popular};

#[derive(Debug, Clone, Default)]
pub struct ActionInput {
    pub name: String,
    pub required: bool,
    pub deprecated: bool,
    pub deprecation_message: String,
}

#[derive(Debug, Clone, Default)]
pub struct ActionRuns {
    pub using: String,
    pub main: String,
    pub pre: String,
    pub pre_if: String,
    pub post: String,
    pub post_if: String,
    pub steps: Option<usize>,
    pub image: String,
    pub pre_entrypoint: String,
    pub entrypoint: String,
    pub post_entrypoint: String,
    pub args: bool,
    pub env: bool,
}

#[derive(Debug, Clone, Default)]
pub struct Branding {
    pub icon: String,
    pub color: String,
}

#[derive(Debug, Clone, Default)]
pub struct ActionMetadata {
    pub dir: PathBuf,
    pub file: String,
    pub name: String,
    pub description: String,
    pub inputs: BTreeMap<String, ActionInput>,
    pub outputs: BTreeMap<String, String>,
    pub skip_inputs: bool,
    pub skip_outputs: bool,
    pub runs: ActionRuns,
    pub branding: Branding,
}

impl ActionMetadata {
    #[must_use]
    pub fn path(&self) -> PathBuf {
        self.dir.join(&self.file)
    }
}

pub struct Found {
    pub metadata: Arc<ActionMetadata>,
    pub cached: bool,
}

#[derive(Default)]
pub struct LocalActions {
    cache: Mutex<HashMap<String, Option<Arc<ActionMetadata>>>>,
}

#[must_use]
pub fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn clean_join(root: &Path, spec: &str) -> PathBuf {
    let mut out = root.to_path_buf();
    for part in spec.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                out.pop();
            }
            part => out.push(part),
        }
    }
    out
}

impl LocalActions {
    pub fn find(&self, root: &Path, spec: &str) -> Result<Option<Found>, String> {
        let Some(relative) = crate::shared::uses::local_path(spec) else {
            return Ok(None);
        };
        if let Ok(cache) = self.cache.lock()
            && let Some(hit) = cache.get(spec)
        {
            return Ok(hit.clone().map(|metadata| Found {
                metadata,
                cached: true,
            }));
        }
        let dir = clean_join(root, relative);
        let read = ["action.yaml", "action.yml"]
            .iter()
            .find_map(|file| Some((std::fs::read_to_string(dir.join(file)).ok()?, *file)));
        let Some((source, file)) = read else {
            self.store(spec, None);
            return Ok(None);
        };
        match decode::decode(&source) {
            Ok(mut metadata) => {
                metadata.dir = dir;
                file.clone_into(&mut metadata.file);
                let metadata = Arc::new(metadata);
                self.store(spec, Some(Arc::clone(&metadata)));
                Ok(Some(Found {
                    metadata,
                    cached: false,
                }))
            }
            Err(message) => {
                self.store(spec, None);
                Err(format!(
                    "could not parse action metadata in {}: {message}",
                    crate::shared::text::quote(&display_path(&dir))
                ))
            }
        }
    }

    fn store(&self, spec: &str, value: Option<Arc<ActionMetadata>>) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(spec.to_owned(), value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joins_specs_like_go_filepath() {
        assert_eq!(
            clean_join(Path::new("/r"), "./a/../b/"),
            PathBuf::from("/r/b")
        );
    }

    #[test]
    fn reports_missing_metadata_as_none() {
        let actions = LocalActions::default();
        let found = actions.find(Path::new("/nonexistent"), "./x");
        assert!(matches!(found, Ok(None)));
        assert!(matches!(actions.find(Path::new("/r"), "o/r@v1"), Ok(None)));
    }
}
