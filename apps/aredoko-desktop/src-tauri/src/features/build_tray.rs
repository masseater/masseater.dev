use tauri::App;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

use crate::shared::ui::show_main;

const OPEN_ITEM: &str = "open";
const QUIT_ITEM: &str = "quit";

pub fn build_tray(app: &App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, OPEN_ITEM, "aredoko を開く", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ITEM, "終了", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    let mut tray = TrayIconBuilder::new()
        .tooltip("aredoko")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            OPEN_ITEM => show_main(app),
            QUIT_ITEM => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
