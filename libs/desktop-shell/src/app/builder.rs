use tauri::{Builder, Wry};

use crate::features::record_telemetry::telemetry_plugin;
use crate::features::serve_screen::served;
use crate::features::update_app::updates_plugin;
use crate::shared::ui::{browser_keys_plugin, japanese_menu, log_plugin, show, state_plugin};

pub struct Shell {
    pub name: &'static str,
    pub window: &'static str,
    pub port: u16,
}

#[must_use]
pub fn builder(shell: &Shell) -> Builder<Wry> {
    let window = shell.window;
    let name = shell.name;
    let app = Builder::default();
    let app = if cfg!(target_os = "macos") {
        app.menu(move |handle| japanese_menu(handle, name))
    } else {
        app
    };
    served(
        app.plugin(tauri_plugin_single_instance::init(
            move |handle, _arguments, _cwd| {
                show(handle, window);
            },
        ))
        .plugin(telemetry_plugin())
        .plugin(log_plugin())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(updates_plugin())
        .plugin(state_plugin())
        .plugin(browser_keys_plugin()),
        shell.port,
    )
}
