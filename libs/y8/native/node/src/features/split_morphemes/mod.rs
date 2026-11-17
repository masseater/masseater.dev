use napi::JsString;
use napi::bindgen_prelude::Result;
use napi_derive::napi;
use tracing::info_span;

use crate::shared::telemetry;

#[napi]
pub fn tokenize(text: JsString) -> Result<String> {
    telemetry::init();
    let text = text.into_utf8()?;
    let text = text.as_str()?;
    let _span = info_span!("y8.tokenize", "y8.text_length" = text.len()).entered();
    serde_json::to_string(&y8_core::tokenize(text))
        .map_err(|error| napi::Error::from_reason(error.to_string()))
}
