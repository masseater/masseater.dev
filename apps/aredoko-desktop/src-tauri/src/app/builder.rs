use std::sync::Mutex;

use tauri::{App, Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use crate::features::build_tray::build_tray;
use crate::features::run_server::{Server, spawn_server, stop_server};
use crate::shared::ui::{MAIN_WINDOW, show_main};

const HIDDEN_FLAG: &str = "--hidden";

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let child = spawn_server(app.handle())?;
    app.manage(Server(Mutex::new(Some(child))));
    build_tray(app)?;
    if std::env::args().any(|argument| argument == HIDDEN_FLAG)
        && let Some(window) = app.get_webview_window(MAIN_WINDOW)
    {
        window.hide()?;
    }
    Ok(())
}

pub fn run() -> tauri::Result<()> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _cwd| {
                show_main(app);
            },
        ))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![HIDDEN_FLAG]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup)
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())?;
    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            stop_server(app);
        }
    });
    Ok(())
}
