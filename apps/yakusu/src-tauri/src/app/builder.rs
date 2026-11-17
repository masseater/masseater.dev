use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, RunEvent};
use tokio::sync::watch;

use crate::entities::engine::{Engine, Phase, Process};

const MAIN_WINDOW: &str = "main";

fn stop_engine(app: &AppHandle) {
    let engine = app.state::<Engine>();
    if let Ok(mut process) = engine.process.lock() {
        process.stop();
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn run() -> tauri::Result<()> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _cwd| {
                show_main(app);
            },
        ))
        .manage(Engine {
            phase: watch::Sender::new(Phase::Idle),
            process: Arc::new(Mutex::new(Process::Idle)),
            inflight: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            crate::features::prepare_engine::prepare,
            crate::features::translate_text::translate
        ])
        .build(tauri::generate_context!())?;
    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            stop_engine(app);
        }
    });
    Ok(())
}
