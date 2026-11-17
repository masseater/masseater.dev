use media_notes::{Failure, Store};
use tauri::State;

use crate::entities::taste::{Taste, chosen, forecasts, judged};
use crate::shared::protocol::{Choice, Forecast, Judgement, Mark, Pair, Statement};

type Answer<T> = Result<T, Failure>;

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
