use tauri::Runtime;
use tauri::plugin::TauriPlugin;
use tauri_plugin_log::{RotationStrategy, log::LevelFilter};

const LOG_FILE_BYTES: u128 = 1_000_000;
const LOG_FILES_KEPT: usize = 5;

#[must_use]
pub fn log_plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .level(LevelFilter::Info)
        .max_file_size(LOG_FILE_BYTES)
        .rotation_strategy(RotationStrategy::KeepSome(LOG_FILES_KEPT))
        .build()
}
