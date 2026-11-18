use napi::bindgen_prelude::{AsyncTask, Result};
use napi_derive::napi;

use napi_telemetry as telemetry;

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
pub fn flush_telemetry() -> AsyncTask<Flush> {
    AsyncTask::new(Flush)
}
