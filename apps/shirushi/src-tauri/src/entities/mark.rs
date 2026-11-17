use media_notes::{Failure, Row, Saved, Store, fresh_id, now};

use crate::shared::protocol::{Mark, MarkInput};

pub const TABLE: &str = "marks";

pub fn saved(store: &Store, input: MarkInput) -> Result<Saved, Failure> {
    let mark = Mark {
        id: fresh_id(),
        song: input.song,
        from: input.from,
        to: input.to,
        verb: input.verb,
        aspects: input.aspects,
        words: input.words,
        at: now(),
    };
    store.put(&Row {
        id: &mark.id,
        source: &mark.song.source,
        at: mark.at,
        value: &mark,
    })?;
    Ok(Saved {
        id: mark.id,
        at: mark.at,
    })
}
