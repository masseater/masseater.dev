const COMMANDS: &[&str] = &[
    "list_songs",
    "song_folder",
    "remove_song",
    "list_models",
    "list_jobs",
    "import_song",
    "separate_song",
    "analyze_song",
    "choose_audio_files",
    "mcp_access",
];

const CUDA_RUNTIME: &str = "cuda/runtime.json";

fn delay_cuda_runtime() {
    println!("cargo::rerun-if-changed={CUDA_RUNTIME}");
    let windows = std::env::var("CARGO_CFG_TARGET_OS").is_ok_and(|os| os == "windows");
    if !windows || std::env::var_os("CARGO_FEATURE_CUDA").is_none() {
        return;
    }
    let Ok(text) = std::fs::read_to_string(CUDA_RUNTIME) else {
        return;
    };
    let manifest: serde_json::Value = serde_json::from_str(&text).expect("cuda runtime manifest");
    let files = manifest["files"].as_array().expect("cuda runtime files");
    for name in files.iter().filter_map(|file| file["name"].as_str()) {
        println!("cargo::rustc-link-arg-bins=/DELAYLOAD:{name}");
    }
    println!("cargo::rustc-link-arg-bins=delayimp.lib");
}

fn main() {
    delay_cuda_runtime();
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("tauri build");
}
