use schemars::JsonSchema;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::failure::{Failure, Outcome};

use super::claude::{Ask, Claude};

const WRITING_MODEL: &str = "claude-opus-5-5";
const JUDGING_MODEL: &str = "claude-haiku-5-5";
const JUDGING_TURNS: u32 = 8;
const WRITING_TURNS: u32 = 1;

fn schema_of<T: JsonSchema>() -> Value {
    let mut schema = serde_json::to_value(schemars::schema_for!(T)).unwrap_or(Value::Null);
    if let Some(object) = schema.as_object_mut() {
        object.remove("$schema");
        object.remove("title");
    }
    schema
}

pub async fn write(
    claude: &Claude,
    system: &str,
    prompt: &str,
    on_text: impl FnMut(String),
) -> Outcome<()> {
    let ask = Ask {
        system,
        prompt,
        model: WRITING_MODEL,
        tools: &[],
        max_turns: WRITING_TURNS,
        schema: None,
        streaming: true,
    };
    claude.run(&ask, on_text).await.map(|_| ())
}

pub async fn judge<T: DeserializeOwned + JsonSchema>(
    claude: &Claude,
    system: &str,
    prompt: &str,
    tools: &[&str],
) -> Outcome<T> {
    let schema = schema_of::<T>();
    let ask = Ask {
        system,
        prompt,
        model: JUDGING_MODEL,
        tools,
        max_turns: JUDGING_TURNS,
        schema: Some(&schema),
        streaming: false,
    };
    let answer = claude.run(&ask, |_| {}).await?;
    serde_json::from_value(answer).map_err(|error| Failure::new(error.to_string()))
}
