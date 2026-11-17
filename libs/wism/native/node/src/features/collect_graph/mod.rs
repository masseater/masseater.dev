use napi::bindgen_prelude::{Result, Uint32Array};
use napi_derive::napi;
use tracing::info_span;
use wism_core::graph;

use crate::shared::telemetry;

#[napi(object)]
pub struct CollectOptions {
    pub traceparent: Option<String>,
}

#[napi]
pub fn collect(root: String, files: Vec<String>, options: CollectOptions) -> Result<Uint32Array> {
    telemetry::init();
    let span = info_span!("wism.collect", "wism.files" = files.len());
    let CollectOptions { traceparent } = options;
    telemetry::adopt(&span, traceparent.as_deref());
    let _entered = span.enter();
    Ok(Uint32Array::new(graph(
        std::path::PathBuf::from(root),
        files,
    )))
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
