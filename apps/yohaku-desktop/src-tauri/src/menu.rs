use tauri::menu::{Menu, MenuBuilder, SubmenuBuilder};
use tauri::{AppHandle, Wry};

pub fn japanese(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let yohaku = SubmenuBuilder::new(app, "余白")
        .about_with_text("余白について", None)
        .separator()
        .services_with_text("サービス")
        .separator()
        .hide_with_text("余白を隠す")
        .hide_others_with_text("ほかを隠す")
        .show_all_with_text("すべてを表示")
        .separator()
        .quit_with_text("余白を終了")
        .build()?;
    let edit = SubmenuBuilder::new(app, "編集")
        .undo_with_text("取り消す")
        .redo_with_text("やり直す")
        .separator()
        .cut_with_text("カット")
        .copy_with_text("コピー")
        .paste_with_text("ペースト")
        .select_all_with_text("すべてを選択")
        .build()?;
    let view = SubmenuBuilder::new(app, "表示")
        .fullscreen_with_text("フルスクリーンにする")
        .build()?;
    let window = SubmenuBuilder::new(app, "ウインドウ")
        .minimize_with_text("しまう")
        .maximize_with_text("拡大／縮小")
        .separator()
        .close_window_with_text("閉じる")
        .build()?;
    MenuBuilder::new(app)
        .items(&[&yohaku, &edit, &view, &window])
        .build()
}
