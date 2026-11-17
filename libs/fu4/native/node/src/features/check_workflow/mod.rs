use fu4_core::{Config, Context, Project, check};
use napi::bindgen_prelude::Result;
use napi_derive::napi;
use rayon::prelude::*;
use serde_json::{Value, json};
use tracing::info_span;

use crate::shared::telemetry;

#[napi(object)]
pub struct LintOptions {
    pub traceparent: Option<String>,
    pub config: Option<Value>,
}

#[napi]
pub fn lint_paths(root: String, paths: Vec<String>, options: LintOptions) -> Result<Value> {
    telemetry::init();
    let span = info_span!("fu4.lint_paths", "fu4.files" = paths.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let parent = tracing::Span::current();
    let base = std::path::PathBuf::from(&root);
    let config: Config = match options.config {
        Some(value) => serde_json::from_value(value)
            .map_err(|error| napi::Error::from_reason(format!("invalid fu4 config: {error}")))?,
        None => Config::default(),
    };
    let project = Project::new(base.clone(), &config).map_err(napi::Error::from_reason)?;
    let results = paths
        .into_par_iter()
        .map(|path| {
            let _check = info_span!(parent: &parent, "fu4.check_file", "code.file.path" = path.as_str()).entered();
            let text = match std::fs::read_to_string(base.join(&path)) {
                Ok(text) => text,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
                Err(error) => return Err(napi::Error::from_reason(format!("{path}: {error}"))),
            };
            let context = Context {
                path: path.clone(),
                project: Some(std::sync::Arc::clone(&project)),
            };
            let diagnostics: Vec<Value> = check(&context, &text)
                .into_iter()
                .map(|d| json!({ "line": d.pos.line, "column": d.pos.col, "message": d.message, "kind": d.kind }))
                .collect();
            Ok(Some(json!({ "path": path, "diagnostics": diagnostics })))
        })
        .collect::<Result<Vec<Option<Value>>>>()?;
    Ok(Value::Array(results.into_iter().flatten().collect()))
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
