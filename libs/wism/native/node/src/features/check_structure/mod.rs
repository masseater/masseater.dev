use napi::bindgen_prelude::Result;
use napi_derive::napi;
use serde_json::Value;
use tracing::info_span;
use wism_core::{Config, Linter};

use crate::shared::telemetry;

#[napi(object)]
pub struct LintOptions {
    pub config: Option<Value>,
    pub keep_graph: Option<bool>,
    pub traceparent: Option<String>,
}

fn reason(error: impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}

#[napi]
pub fn lint(root: String, files: Vec<String>, options: LintOptions) -> Result<Value> {
    telemetry::init();
    let span = info_span!("wism.lint", "wism.files" = files.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let config: Config = options
        .config
        .map(serde_json::from_value)
        .transpose()
        .map_err(reason)?
        .unwrap_or_default();
    let linter = Linter::new(config, std::path::PathBuf::from(root));
    let report = linter
        .lint(files, options.keep_graph.unwrap_or(false))
        .map_err(reason)?;
    serde_json::to_value(report).map_err(reason)
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
