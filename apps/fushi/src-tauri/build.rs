const COMMANDS: &[&str] = &[
    "export_preset",
    "load_library",
    "save_library",
    "list_baselines",
    "read_baseline",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("tauri build");
}
