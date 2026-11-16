const COMMANDS: &[&str] = &[
    "list_marks",
    "save_mark",
    "remove_mark",
    "get_still",
    "list_pairs",
    "choose_pair",
    "list_statements",
    "judge_statement",
    "list_forecasts",
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
