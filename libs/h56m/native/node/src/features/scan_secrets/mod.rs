use std::path::Path;

use h56m_core::{Detector, GitSource};
use napi::bindgen_prelude::Result;
use napi_derive::napi;
use napi_telemetry as telemetry;
use serde_json::Value;
use tracing::info_span;

const SERVICE: &str = "h56m";

fn failed(error: impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}

fn to_value<T: serde::Serialize>(value: &T) -> Result<Value> {
    serde_json::to_value(value).map_err(failed)
}

#[napi(object)]
pub struct DetectorInput {
    pub config: Value,
    pub ignored: Vec<String>,
    pub traceparent: Option<String>,
}

#[napi(object)]
pub struct TextInput {
    pub path: String,
    pub text: String,
    pub traceparent: Option<String>,
}

#[napi(object)]
pub struct GitInput {
    pub root: String,
    pub source: Value,
    pub traceparent: Option<String>,
}

#[napi]
pub struct SecretDetector {
    detector: Detector,
}

#[napi]
impl SecretDetector {
    #[napi(constructor)]
    pub fn new(input: DetectorInput) -> Result<Self> {
        let DetectorInput {
            config,
            ignored,
            traceparent,
        } = input;
        telemetry::init(SERVICE, env!("CARGO_PKG_VERSION"));
        let span = info_span!("h56m.detector");
        telemetry::adopt(&span, traceparent.as_deref());
        let _entered = span.enter();
        Ok(Self {
            detector: Detector::new(&config, ignored).map_err(failed)?,
        })
    }

    #[napi]
    pub fn scan(&self, input: TextInput) -> Result<Value> {
        let TextInput {
            path,
            text,
            traceparent,
        } = input;
        let span = info_span!("h56m.scan", "code.file.path" = path.as_str());
        telemetry::adopt(&span, traceparent.as_deref());
        let _entered = span.enter();
        to_value(&self.detector.scan(&path, text.as_bytes()).map_err(failed)?)
    }

    #[napi]
    pub fn scan_git(&self, input: GitInput) -> Result<Value> {
        let GitInput {
            root,
            source,
            traceparent,
        } = input;
        let span = info_span!("h56m.git", "h56m.root" = root.as_str());
        telemetry::adopt(&span, traceparent.as_deref());
        let _entered = span.enter();
        let source: GitSource = serde_json::from_value(source).map_err(failed)?;
        to_value(
            &self
                .detector
                .scan_git(Path::new(&root), &source)
                .map_err(failed)?,
        )
    }
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
