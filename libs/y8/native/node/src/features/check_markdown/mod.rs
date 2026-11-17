use napi::bindgen_prelude::Result;
use napi_derive::napi;
use rayon::prelude::*;
use serde_json::{Map, Value, json};
use tracing::info_span;
use y8_core::{Input, Linter, builtin_rules};

use crate::shared::telemetry;

#[napi(object)]
pub struct FileInput {
    pub path: String,
    pub text: String,
}

#[napi(object)]
pub struct LintOptions {
    pub config: Option<Value>,
    pub inline_config: Option<bool>,
    pub keep_tree: Option<bool>,
    pub keep_text: Option<bool>,
    pub traceparent: Option<String>,
}

fn linter(config: Option<Value>, inline: Option<bool>) -> Linter {
    let config = match config {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };
    Linter::new(config, inline.unwrap_or(true))
}

fn run(inputs: &[Input], options: LintOptions) -> Result<Value> {
    let keep_tree = options.keep_tree.unwrap_or(false);
    let keep_text = options.keep_text.unwrap_or(false);
    let linter = linter(options.config, options.inline_config);
    let results = linter.lint_all(inputs, keep_tree);
    let mut value = serde_json::to_value(results)
        .map_err(|error| napi::Error::from_reason(error.to_string()))?;
    if keep_text && let Value::Array(items) = &mut value {
        for (item, input) in items.iter_mut().zip(inputs) {
            if let Value::Object(object) = item {
                object.insert("text".to_owned(), Value::String(input.text.clone()));
            }
        }
    }
    Ok(value)
}

#[napi]
pub fn lint(files: Vec<FileInput>, options: LintOptions) -> Result<Value> {
    telemetry::init();
    let span = info_span!("y8.lint", "y8.files" = files.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let inputs: Vec<Input> = files
        .into_iter()
        .map(|file| Input {
            path: file.path,
            text: file.text,
        })
        .collect();
    run(&inputs, options)
}

#[napi]
pub fn lint_paths(root: String, paths: Vec<String>, options: LintOptions) -> Result<Value> {
    telemetry::init();
    let span = info_span!("y8.lint_paths", "y8.files" = paths.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let parent = tracing::Span::current();
    let root = std::path::PathBuf::from(root);
    let inputs = paths
        .into_par_iter()
        .map(|path| {
            let _read =
                info_span!(parent: &parent, "y8.read_file", "code.file.path" = path.as_str())
                    .entered();
            match std::fs::read_to_string(root.join(&path)) {
                Ok(text) => Ok(Some(Input { path, text })),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
                Err(error) => Err(napi::Error::from_reason(format!("{path}: {error}"))),
            }
        })
        .collect::<Result<Vec<Option<Input>>>>()?
        .into_iter()
        .flatten()
        .collect::<Vec<Input>>();
    run(&inputs, options)
}

#[napi]
#[must_use]
pub fn rules() -> Value {
    Value::Array(
        builtin_rules()
            .iter()
            .map(|rule| {
                let meta = rule.meta();
                json!({ "names": meta.names, "description": meta.description, "tags": meta.tags })
            })
            .collect(),
    )
}

pub struct Flush;

impl napi::Task for Flush {
    type Output = ();
    type JsValue = ();

    fn compute(&mut self) -> Result<Self::Output> {
        telemetry::flush();
        Ok(())
    }

    fn resolve(&mut self, _env: napi::Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
#[must_use]
pub fn flush_telemetry() -> napi::bindgen_prelude::AsyncTask<Flush> {
    napi::bindgen_prelude::AsyncTask::new(Flush)
}
