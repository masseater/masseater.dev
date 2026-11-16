const COMMANDS: &[&str] = &[
    "list_marks",
    "save_mark",
    "remove_mark",
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
