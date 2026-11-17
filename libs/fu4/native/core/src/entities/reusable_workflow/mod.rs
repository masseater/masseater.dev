mod decode;

use std::collections::{BTreeMap, HashMap};
use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::entities::workflow::{CallInputType, WorkflowCallEvent, contains_expression};
use crate::shared::expression::types::ExprType;
use crate::shared::text::quote;

#[derive(Debug, Clone)]
pub struct CallInput {
    pub name: String,
    pub required: bool,
    pub ty: ExprType,
}

#[derive(Debug, Clone)]
pub struct CallSecret {
    pub name: String,
    pub required: bool,
}

#[derive(Debug, Clone, Default)]
pub struct ReusableMetadata {
    pub inputs: BTreeMap<String, CallInput>,
    pub outputs: BTreeMap<String, String>,
    pub secrets: BTreeMap<String, CallSecret>,
}

#[must_use]
pub fn input_type(kind: CallInputType) -> ExprType {
    match kind {
        CallInputType::Boolean => ExprType::Bool,
        CallInputType::Number => ExprType::Number,
        CallInputType::String => ExprType::String,
        CallInputType::Invalid => ExprType::Any,
    }
}

impl ReusableMetadata {
    #[must_use]
    pub fn of_event(event: &WorkflowCallEvent) -> Self {
        let inputs = event
            .inputs
            .iter()
            .map(|input| {
                (
                    input.id.clone(),
                    CallInput {
                        name: input.name.value.clone(),
                        required: input.is_required() && input.default.is_none(),
                        ty: input_type(input.kind),
                    },
                )
            })
            .collect();
        let outputs = event
            .outputs
            .iter()
            .map(|(id, output)| (id.clone(), output.name.value.clone()))
            .collect();
        let secrets = event
            .secrets
            .iter()
            .flatten()
            .map(|(id, secret)| {
                (
                    id.clone(),
                    CallSecret {
                        name: secret.name.value.clone(),
                        required: secret.required.as_ref().is_some_and(|r| r.value),
                    },
                )
            })
            .collect();
        Self {
            inputs,
            outputs,
            secrets,
        }
    }
}

#[derive(Default)]
pub struct LocalWorkflows {
    cache: Mutex<HashMap<String, Option<Arc<ReusableMetadata>>>>,
}

impl LocalWorkflows {
    pub fn find(&self, root: &Path, spec: &str) -> Result<Option<Arc<ReusableMetadata>>, String> {
        if !spec.starts_with("./") || contains_expression(spec) {
            return Ok(None);
        }
        if let Ok(cache) = self.cache.lock()
            && let Some(hit) = cache.get(spec)
        {
            return Ok(hit.clone());
        }
        let file = root.join(spec.trim_start_matches("./"));
        let source = match std::fs::read_to_string(&file) {
            Ok(source) => source,
            Err(error) => {
                self.store(spec, None);
                return Err(format!(
                    "could not read reusable workflow file for {}: {error}",
                    quote(spec)
                ));
            }
        };
        match decode::decode(&source) {
            Ok(metadata) => {
                let metadata = Arc::new(metadata);
                self.store(spec, Some(Arc::clone(&metadata)));
                Ok(Some(metadata))
            }
            Err(message) => {
                self.store(spec, None);
                Err(format!(
                    "error while parsing reusable workflow {}: {}",
                    quote(spec),
                    message.replace('\n', " ")
                ))
            }
        }
    }

    pub fn remember_event(&self, root: &Path, path: &str, event: &WorkflowCallEvent) {
        let path = Path::new(path);
        let relative = if path.is_absolute() {
            match path.strip_prefix(root) {
                Ok(relative) => relative.to_path_buf(),
                Err(_) => return,
            }
        } else {
            path.to_path_buf()
        };
        let spec = format!("./{}", relative.to_string_lossy().replace('\\', "/"));
        let Ok(mut cache) = self.cache.lock() else {
            return;
        };
        cache
            .entry(spec)
            .or_insert_with(|| Some(Arc::new(ReusableMetadata::of_event(event))));
    }

    pub fn store(&self, spec: &str, value: Option<Arc<ReusableMetadata>>) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(spec.to_owned(), value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remembers_events_by_relative_spec() {
        let workflows = LocalWorkflows::default();
        workflows.remember_event(
            Path::new("/r"),
            "workflows/a.yaml",
            &WorkflowCallEvent::default(),
        );
        assert!(matches!(
            workflows.find(Path::new("/r"), "./workflows/a.yaml"),
            Ok(Some(_))
        ));
        assert!(
            workflows
                .find(Path::new("/nonexistent"), "./missing.yaml")
                .is_err_and(|e| e.starts_with("could not read reusable workflow file for"))
        );
    }
}
