use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::plugin::TauriPlugin;
use tauri::window::Color;
use tauri::{AppHandle, Emitter, Manager, Theme, Wry, async_runtime};
use tauri_plugin_prevent_default::Flags;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

use crate::MAIN_WINDOW;

pub const CLOSING_EVENT: &str = "yohaku://closing";
const SCREEN_GRACE: Duration = Duration::from_secs(3);
const LIGHT_PAGE: Color = Color(255, 255, 255, 255);
const DARK_PAGE: Color = Color(9, 9, 11, 255);

#[derive(Clone, Default)]
pub struct Closing(Arc<AtomicBool>);

fn remembered() -> StateFlags {
    StateFlags::all() - StateFlags::VISIBLE
}

pub fn state_plugin() -> TauriPlugin<Wry> {
    tauri_plugin_window_state::Builder::new()
        .with_state_flags(remembered())
        .build()
}

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

pub fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn paint_like_the_page(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let page = match window.theme() {
            Ok(Theme::Dark) => DARK_PAGE,
            _ => LIGHT_PAGE,
        };
        let _ = window.set_background_color(Some(page));
    }
}

pub fn show_if_hidden_later(app: &AppHandle) {
    let app = app.clone();
    async_runtime::spawn(async move {
        tokio::time::sleep(SCREEN_GRACE).await;
        let hidden = app
            .get_webview_window(MAIN_WINDOW)
            .is_some_and(|window| !window.is_visible().unwrap_or(true));
        if hidden {
            show(&app);
        }
    });
}

pub fn request_close(app: &AppHandle, quit: bool) {
    if app.state::<Closing>().0.swap(true, Ordering::SeqCst) {
        return;
    }
    let _ = app.emit(CLOSING_EVENT, quit);
    let app = app.clone();
    async_runtime::spawn(async move {
        tokio::time::sleep(SCREEN_GRACE).await;
        finish_close(&app, quit);
    });
}

pub fn finish_close(app: &AppHandle, quit: bool) {
    if !app.state::<Closing>().0.swap(false, Ordering::SeqCst) {
        return;
    }
    let _ = app.save_window_state(remembered());
    if quit || !cfg!(target_os = "macos") {
        app.exit(0);
    } else if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.hide();
    }
}
