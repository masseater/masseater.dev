use rmcp::model::{CallToolResult, ContentBlock};
use serde::Serialize;

use crate::failure::Outcome;

pub fn answer<T: Serialize>(outcome: Outcome<T>) -> CallToolResult {
    match outcome.and_then(|value| Ok(serde_json::to_string(&value)?)) {
        Ok(text) => CallToolResult::success(vec![ContentBlock::text(text)]),
        Err(failure) => CallToolResult::error(vec![ContentBlock::text(failure.message)]),
    }
}
