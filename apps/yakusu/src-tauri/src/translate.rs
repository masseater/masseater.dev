use std::fmt;
use std::pin::pin;

use futures_util::{Stream, StreamExt};

use crate::chunk::{self, Part};
use crate::prompt::{self, Direction, Invalid, Pair};

const MAX_TOKENS: usize = 8192;
const TOKENS_PER_CHAR: usize = 3;
const SPARE_TOKENS: usize = 256;

/// The reason a translation stopped.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    Invalid(Invalid),
    Server(String),
}

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Invalid(invalid) => invalid.fmt(formatter),
            Self::Server(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for Error {}

impl From<Invalid> for Error {
    fn from(invalid: Invalid) -> Self {
        Self::Invalid(invalid)
    }
}

/// The number of tokens the model may generate for `text`.
#[must_use]
pub fn max_tokens(text: &str) -> usize {
    (text.chars().count() * TOKENS_PER_CHAR + SPARE_TOKENS).min(MAX_TOKENS)
}

/// Translates `text` piece by piece, handing each delta to `emit` as the model produces it.
///
/// Every request after the first carries the previous piece and its translation, so the
/// wording stays consistent across pieces.
///
/// # Errors
///
/// Returns an error when the text cannot go into a prompt or the completion fails.
pub async fn translate<Complete, Deltas>(
    direction: &Direction,
    text: &str,
    complete: Complete,
    mut emit: impl FnMut(String),
) -> Result<(), Error>
where
    Complete: Fn(String, usize) -> Deltas,
    Deltas: Stream<Item = Result<String, Error>>,
{
    let mut previous: Option<Pair> = None;
    for part in chunk::split(text, chunk::CHUNK_CHARS) {
        match part {
            Part::Space(space) => emit(space.to_owned()),
            Part::Text(source) => {
                let prompt = prompt::build(direction, previous.as_slice(), source)?;
                let mut deltas = pin!(complete(prompt, max_tokens(source)));
                let mut translation = String::new();
                while let Some(delta) = deltas.next().await {
                    let delta = delta?;
                    translation.push_str(&delta);
                    emit(delta);
                }
                previous = Some(Pair {
                    source: source.to_owned(),
                    translation,
                });
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use futures_util::stream;

    use super::*;
    use crate::prompt::Lang;

    fn to_english() -> Direction {
        Direction {
            source: None,
            target: Lang::try_from("en".to_owned()).unwrap(),
            form: None,
        }
    }

    #[test]
    fn limits_generation_by_the_source_length() {
        assert_eq!(max_tokens("abc"), 265);
        assert_eq!(max_tokens(&"a".repeat(10_000)), MAX_TOKENS);
    }

    #[tokio::test]
    async fn streams_each_piece_and_carries_the_previous_pair() {
        let prompts = RefCell::new(Vec::new());
        let mut emitted = Vec::new();
        let text = format!("{}\n\n{}", "あ".repeat(900), "い".repeat(900));
        translate(
            &to_english(),
            &text,
            |prompt, _| {
                let reply = if prompts.borrow().is_empty() {
                    "A"
                } else {
                    "I"
                };
                prompts.borrow_mut().push(prompt);
                stream::iter([Ok(reply.to_owned()), Ok("!".to_owned())])
            },
            |delta| emitted.push(delta),
        )
        .await
        .unwrap();
        assert_eq!(emitted, ["A", "!", "\n\n", "I", "!"]);
        let prompts = prompts.into_inner();
        assert_eq!(prompts.len(), 2);
        assert!(prompts[1].contains("<|plamo:msg|>A!<|plamo:tag|>input"));
    }

    #[tokio::test]
    async fn stops_at_the_first_failed_completion() {
        let mut emitted = Vec::new();
        let result = translate(
            &to_english(),
            "やあ",
            |_, _| stream::iter([Ok("Hi".to_owned()), Err(Error::Server("gone".to_owned()))]),
            |delta| emitted.push(delta),
        )
        .await;
        assert_eq!(result, Err(Error::Server("gone".to_owned())));
        assert_eq!(emitted, ["Hi"]);
    }
}
