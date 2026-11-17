use tauri::plugin::TauriPlugin;
use tauri::window::Color;
use tauri::{AppHandle, Manager, Theme, WebviewWindow, Wry};
use tauri_plugin_prevent_default::Flags;
use tauri_plugin_window_state::StateFlags;

const LIGHT_PAGE: Color = Color(255, 255, 255, 255);
const DARK_PAGE: Color = Color(9, 9, 11, 255);

#[must_use]
pub fn remembered() -> StateFlags {
    StateFlags::all() - StateFlags::VISIBLE
}

#[must_use]
pub fn state_plugin() -> TauriPlugin<Wry> {
    tauri_plugin_window_state::Builder::new()
        .with_state_flags(remembered())
        .build()
}

#[must_use]
pub fn browser_keys_plugin() -> TauriPlugin<Wry> {
    let kept = Flags::CONTEXT_MENU | Flags::FOCUS_MOVE;
    let kept = if cfg!(debug_assertions) {
        kept | Flags::DEV_TOOLS | Flags::RELOAD
    } else {
        kept
    };
    tauri_plugin_prevent_default::Builder::new()
        .with_flags(Flags::all().difference(kept))
        .build()
}

pub fn paint_like_the_page(window: &WebviewWindow) {
    let page = match window.theme() {
        Ok(Theme::Dark) => DARK_PAGE,
        _ => LIGHT_PAGE,
    };
    let _ = window.set_background_color(Some(page));
}

pub fn show(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
