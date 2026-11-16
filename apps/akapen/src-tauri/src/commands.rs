use media_notes::failure::{Failure, Outcome};
use media_notes::protocol::Saved;
use media_notes::store::{Row, Store, fresh_id, now};
use tauri::State;

use crate::protocol::{Comment, CommentInput, Resolution};

pub const DATABASE: &str = "akapen.db";
pub const TABLE: &str = "comments";
const NO_COMMENT: &str = "そのコメントはありません";

type Answer<T> = Result<T, Failure>;

fn kept(store: &Store, comment: &Comment) -> Outcome<()> {
    store.put(&Row {
        id: &comment.id,
        source: &comment.media.source,
        at: comment.at,
        value: comment,
    })
}

pub fn saved(store: &Store, input: CommentInput) -> Outcome<Saved> {
    let comment = Comment {
        id: fresh_id(),
        media: input.media,
        location: input.location,
        from: input.from,
        to: input.to,
        words: input.words,
        at: now(),
        resolution: None,
    };
    kept(store, &comment)?;
    Ok(Saved {
        id: comment.id,
        at: comment.at,
    })
}

pub fn resolved(store: &Store, id: &str, words: String) -> Outcome<Comment> {
    let mut comment: Comment = store.get(id)?.ok_or_else(|| Failure::new(NO_COMMENT))?;
    comment.resolution = Some(Resolution { at: now(), words });
    kept(store, &comment)?;
    Ok(comment)
}

#[tauri::command]
#[specta::specta]
pub async fn list_comments(store: State<'_, Store>) -> Answer<Vec<Comment>> {
    store.list(None)
}

#[tauri::command]
#[specta::specta]
pub async fn save_comment(store: State<'_, Store>, input: CommentInput) -> Answer<Saved> {
    saved(&store, input)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_comment(store: State<'_, Store>, id: String) -> Answer<bool> {
    store.remove(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn restore_comment(store: State<'_, Store>, comment: Comment) -> Answer<()> {
    kept(&store, &comment)
}
