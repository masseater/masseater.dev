mod menu;
mod served;
mod window;

pub use menu::japanese_menu;
pub use served::{Setup, open_window, screen_port, served};
pub use window::{browser_keys_plugin, paint_like_the_page, remembered, show, state_plugin};

use tauri::{Builder, Wry};

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(state_plugin())
        .plugin(browser_keys_plugin()),
        shell.port,
    )
}
