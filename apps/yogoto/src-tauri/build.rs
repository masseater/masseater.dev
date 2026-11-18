const COMMANDS: &[&str] = &[
    "list_songs",
    "song_folder",
    "remove_song",
    "list_models",
    "list_jobs",
    "import_song",
    "separate_song",
    "choose_audio_files",
    "mcp_access",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("tauri build");
}
