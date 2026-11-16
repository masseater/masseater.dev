const COMMANDS: &[&str] = &[
    "list_comments",
    "save_comment",
    "remove_comment",
    "restore_comment",
    "open_link",
    "open_file",
    "choose_file",
    "mcp_access",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("tauri build");
}
