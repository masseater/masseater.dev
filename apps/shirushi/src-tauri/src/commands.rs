use media_notes::failure::Failure;
use media_notes::protocol::Saved;
use media_notes::store::{Row, Store, fresh_id, now};
use tauri::State;

use crate::protocol::{Choice, Forecast, Judgement, Mark, MarkInput, Pair, Statement};
use crate::taste::{Taste, chosen, forecasts, judged};

pub const DATABASE: &str = "shirushi.db";
pub const TABLE: &str = "marks";

type Answer<T> = Result<T, Failure>;

pub fn saved(store: &Store, input: MarkInput) -> Answer<Saved> {
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

#[tauri::command]
#[specta::specta]
pub async fn list_marks(store: State<'_, Store>) -> Answer<Vec<Mark>> {
    store.list(None)
}

#[tauri::command]
#[specta::specta]
pub async fn save_mark(store: State<'_, Store>, input: MarkInput) -> Answer<Saved> {
    saved(&store, input)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_mark(store: State<'_, Store>, id: String) -> Answer<bool> {
    store.remove(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn list_pairs(taste: State<'_, Taste>) -> Answer<Vec<Pair>> {
    taste.pairs.list(None)
}

#[tauri::command]
#[specta::specta]
pub async fn choose_pair(taste: State<'_, Taste>, id: String, choice: Choice) -> Answer<Pair> {
    chosen(&taste, &id, choice)
}

#[tauri::command]
#[specta::specta]
pub async fn list_statements(taste: State<'_, Taste>) -> Answer<Vec<Statement>> {
    taste.statements.list(None)
}

#[tauri::command]
#[specta::specta]
pub async fn judge_statement(
    taste: State<'_, Taste>,
    id: String,
    judgement: Judgement,
) -> Answer<Statement> {
    judged(&taste, &id, judgement)
}

#[tauri::command]
#[specta::specta]
pub async fn list_forecasts(
    store: State<'_, Store>,
    taste: State<'_, Taste>,
) -> Answer<Vec<Forecast>> {
    forecasts(&taste, &store.list::<Mark>(None)?, None)
}
