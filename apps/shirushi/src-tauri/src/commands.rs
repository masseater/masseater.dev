use tauri::State;

use crate::failure::{Failure, Outcome};
use crate::protocol::{Mark, MarkInput, McpAccess, Saved, Song};
use crate::song::song_of;
use crate::source::source_of;
use crate::store::Store;

const NOT_A_SONG: &str = "YouTube・ニコニコ・SoundCloud の曲のリンクではありません";

pub struct Shirushi {
    pub store: Store,
    pub client: reqwest::Client,
    pub mcp_token: String,
}

type Answer<T> = Result<T, Failure>;

#[tauri::command]
#[specta::specta]
pub async fn list_marks(shirushi: State<'_, Shirushi>, link: String) -> Answer<Vec<Mark>> {
    shirushi.store.list(source_of(&link).as_ref())
}

#[tauri::command]
#[specta::specta]
pub async fn save_mark(shirushi: State<'_, Shirushi>, input: MarkInput) -> Answer<Saved> {
    shirushi.store.save(input)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_mark(shirushi: State<'_, Shirushi>, id: String) -> Answer<bool> {
    shirushi.store.remove(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn song_at(shirushi: State<'_, Shirushi>, link: String) -> Answer<Song> {
    let source = source_of(&link).ok_or_else(|| Failure::new(NOT_A_SONG))?;
    Ok(song_of(&shirushi.client, source).await)
}

#[tauri::command]
#[specta::specta]
pub async fn mcp_access(shirushi: State<'_, Shirushi>) -> Answer<McpAccess> {
    Ok(McpAccess {
        url: local_mcp::url(crate::mcp::PORT),
        token: shirushi.mcp_token.clone(),
    })
}

pub fn shirushi(data: &std::path::Path) -> Outcome<Shirushi> {
    Ok(Shirushi {
        store: Store::open(data)?,
        client: reqwest::Client::new(),
        mcp_token: local_mcp::token(data)?,
    })
}
