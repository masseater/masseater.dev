use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, async_runtime};
use tauri_plugin_window_state::AppHandleExt;

use crate::MAIN_WINDOW;
use crate::commands::Yohaku;

pub const CLOSING_EVENT: &str = "yohaku://closing";
const SCREEN_GRACE: Duration = Duration::from_secs(3);

#[derive(Clone, Default)]
pub struct Closing(Arc<AtomicBool>);

pub fn show(app: &AppHandle) {
    desktop_shell::show(app, MAIN_WINDOW);
    rest_while_out_of_sight(app);
}

pub fn rest_while_out_of_sight(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    let visible = window.is_visible().unwrap_or(true);
    let minimized = window.is_minimized().unwrap_or(false);
    if let Some(yohaku) = app.try_state::<Yohaku>() {
        yohaku.syncer.rest(!visible || minimized);
    }
}

pub fn paint_like_the_page(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        desktop_shell::paint_like_the_page(&window);
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
    let _ = app.save_window_state(desktop_shell::remembered());
    if quit || !cfg!(target_os = "macos") {
        app.exit(0);
    } else if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.hide();
        rest_while_out_of_sight(app);
    }
}
