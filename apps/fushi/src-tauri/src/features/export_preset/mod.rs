use std::fs;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::shared::Answer;

const EXTENSIONS: [&str; 1] = ["json"];

#[tauri::command]
#[specta::specta]
pub async fn export_preset(app: AppHandle, name: String, json: String) -> Answer<bool> {
    let chosen = app
        .dialog()
        .file()
        .set_file_name(format!("{name}.json"))
        .add_filter("i68", &EXTENSIONS)
        .blocking_save_file();
    let Some(chosen) = chosen else {
        return Ok(false);
    };
    fs::write(chosen.into_path()?, json)?;
    Ok(true)
}
