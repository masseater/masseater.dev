use fu4_core::{
    AuditFile, AuditOptions, AuditReport, Config, Context, Diagnostic, Project, audit, check,
    is_workflow,
};
use napi::bindgen_prelude::Result;
use napi_derive::napi;
use rayon::prelude::*;
use serde_json::{Value, json};
use tracing::info_span;

use napi_telemetry as telemetry;

#[napi(object)]
pub struct LintOptions {
    pub traceparent: Option<String>,
    pub config: Option<Value>,
    pub audit: Option<Value>,
}

fn parsed<T: serde::de::DeserializeOwned + Default>(value: Option<Value>, what: &str) -> Result<T> {
    value.map_or_else(
        || Ok(T::default()),
        |value| {
            serde_json::from_value(value)
                .map_err(|error| napi::Error::from_reason(format!("invalid fu4 {what}: {error}")))
        },
    )
}

fn as_json(diagnostic: &Diagnostic) -> Value {
    json!({
        "line": diagnostic.pos.line,
        "column": diagnostic.pos.col,
        "message": diagnostic.message,
        "kind": diagnostic.kind,
    })
}

#[napi]
pub fn lint_paths(root: String, paths: Vec<String>, options: LintOptions) -> Result<Value> {
    telemetry::init("fu4", env!("CARGO_PKG_VERSION"));
    let span = info_span!("fu4.lint_paths", "fu4.files" = paths.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let parent = tracing::Span::current();
    let base = std::path::PathBuf::from(root);
    let config: Config = parsed(options.config, "config")?;
    let audit_options: AuditOptions = parsed(options.audit, "audit options")?;
    let project = Project::new(base.clone(), &config).map_err(napi::Error::from_reason)?;
    let files = paths
        .into_par_iter()
        .map(|path| match std::fs::read_to_string(base.join(&path)) {
            Ok(text) => Ok(Some(AuditFile { path, text })),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(napi::Error::from_reason(format!("{path}: {error}"))),
        })
        .collect::<Result<Vec<Option<AuditFile>>>>()?
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    let checked = files
        .par_iter()
        .map(|file| {
            let _check = info_span!(parent: &parent, "fu4.check_file", "code.file.path" = file.path.as_str()).entered();
            let context = Context {
                path: file.path.clone(),
                project: Some(std::sync::Arc::clone(&project)),
            };
            if is_workflow(&file.path) {
                check(&context, &file.text)
            } else {
                Vec::new()
            }
        })
        .collect::<Vec<_>>();
    let paths = files
        .iter()
        .map(|file| file.path.clone())
        .collect::<Vec<_>>();
    let audited =
        audit(&base.to_string_lossy(), files, &audit_options).map_err(napi::Error::from_reason)?;
    let results = paths
        .into_iter()
        .zip(checked)
        .map(|(path, mut diagnostics)| {
            diagnostics.extend(
                audited
                    .iter()
                    .filter(|report: &&AuditReport| report.path == path)
                    .flat_map(|report| report.diagnostics.iter().cloned()),
            );
            diagnostics.sort_by(|a, b| a.pos.cmp(&b.pos).then_with(|| a.kind.cmp(&b.kind)));
            json!({ "path": path, "diagnostics": diagnostics.iter().map(as_json).collect::<Vec<_>>() })
        })
        .collect();
    Ok(Value::Array(results))
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
