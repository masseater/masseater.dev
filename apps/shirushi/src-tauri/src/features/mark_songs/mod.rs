use media_notes::{Failure, Saved, Store};
use tauri::State;

use crate::entities::mark::saved;
use crate::entities::still::Stills;
use crate::shared::protocol::{Mark, MarkInput};

type Answer<T> = Result<T, Failure>;

#[tauri::command]
#[specta::specta]
pub async fn list_marks(store: State<'_, Store>) -> Answer<Vec<Mark>> {
    store.list(None)
}

#[tauri::command]
#[specta::specta]
pub async fn save_mark(
    store: State<'_, Store>,
    stills: State<'_, Stills>,
    input: MarkInput,
    still: Option<String>,
) -> Answer<Saved> {
    let mark = saved(&store, input)?;
    if let Some(jpeg) = still {
        stills.put(&mark.id, mark.at, jpeg)?;
    }
    Ok(mark)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_mark(
    store: State<'_, Store>,
    stills: State<'_, Stills>,
    id: String,
) -> Answer<bool> {
    stills.remove(&id)?;
    store.remove(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn get_still(stills: State<'_, Stills>, id: String) -> Answer<Option<String>> {
    stills.get(&id)
}
