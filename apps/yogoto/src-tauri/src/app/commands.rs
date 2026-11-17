use media_notes::Failure;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use super::workshop::Workshop;
use crate::entities::model::{MODELS, model_info};
use crate::shared::protocol::{ImportRequest, Job, ModelInfo, SeparateRequest, Song};

type Answer<T> = Result<T, Failure>;

const AUDIO_EXTENSIONS: &[&str] = &["wav", "flac", "mp3", "m4a", "aac", "ogg", "opus", "webm", "mp4", "aiff", "aif"];

#[tauri::command]
#[specta::specta]
pub async fn list_songs(workshop: State<'_, Workshop>) -> Answer<Vec<Song>> {
    workshop.library.list()
}

#[tauri::command]
#[specta::specta]
pub async fn song_folder(workshop: State<'_, Workshop>, id: String) -> Answer<String> {
    Ok(workshop.library.folder(&id).to_string_lossy().into_owned())
}

#[tauri::command]
#[specta::specta]
pub async fn remove_song(workshop: State<'_, Workshop>, id: String) -> Answer<bool> {
    let removed = workshop.library.remove(&id)?;
    workshop.jobs.touch();
    Ok(removed)
}

#[tauri::command]
#[specta::specta]
pub async fn list_models() -> Answer<Vec<ModelInfo>> {
    Ok(MODELS.iter().map(model_info).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn list_jobs(workshop: State<'_, Workshop>) -> Answer<Vec<Job>> {
    Ok(workshop.jobs.list())
}

#[tauri::command]
#[specta::specta]
pub async fn import_song(workshop: State<'_, Workshop>, request: ImportRequest) -> Answer<String> {
    workshop.import(&request.location, &request.models)
}

#[tauri::command]
#[specta::specta]
pub async fn separate_song(workshop: State<'_, Workshop>, request: SeparateRequest) -> Answer<String> {
    let song = workshop.library.get(&request.song_id)?.ok_or_else(|| Failure::new("song not found"))?;
    workshop.separate(&song, &request.model)
}

#[tauri::command]
#[specta::specta]
pub async fn choose_audio_files(app: AppHandle) -> Answer<Vec<String>> {
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.dialog().file().add_filter("audio", AUDIO_EXTENSIONS).pick_files(move |picked| {
        let _ = sender.send(picked.unwrap_or_default());
    });
    let picked = receiver.await.map_err(|error| Failure::new(error.to_string()))?;
    Ok(picked.into_iter().filter_map(|path| path.into_path().ok()).map(|path| path.to_string_lossy().into_owned()).collect())
}
