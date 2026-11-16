const COMMANDS: &[&str] = &[
    "list_marks",
    "save_mark",
    "remove_mark",
    "song_at",
    "mcp_access",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("tauri build");
}
