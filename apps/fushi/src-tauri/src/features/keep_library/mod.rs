use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::shared::Answer;

const FILE: &str = "library.json";
const PENDING: &str = "library.json.pending";

fn data_dir(app: &AppHandle) -> Answer<PathBuf> {
    let dir = app.path().app_local_data_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[tauri::command]
#[specta::specta]
pub async fn load_library(app: AppHandle) -> Answer<Option<String>> {
    let path = data_dir(&app)?.join(FILE);
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(fs::read_to_string(path)?))
}

#[tauri::command]
#[specta::specta]
pub async fn save_library(app: AppHandle, json: String) -> Answer<()> {
    let dir = data_dir(&app)?;
    let pending = dir.join(PENDING);
    fs::write(&pending, json)?;
    fs::rename(pending, dir.join(FILE))?;
    Ok(())
}
