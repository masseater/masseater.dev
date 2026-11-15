use std::path::Path;

use tauri::{App, Manager, RunEvent, WindowEvent, async_runtime};
use tauri_plugin_log::{RotationStrategy, log::LevelFilter};
use tauri_specta::{Builder, ErrorHandlingMode, collect_commands};

mod commands;
mod export;
mod failure;
mod mcp;
mod menu;
mod model;
pub mod protocol;
mod store;
mod sync;
mod text;
mod updates;
mod window;
mod writing;

use commands::Yohaku;
use failure::Failure;
use store::Store;
use sync::Syncer;
use writing::claude::Claude;
use writing::understanding::Understanding;

const MAIN_WINDOW: &str = "main";
const WORK_DIRECTORY: &str = "work";
const LOG_FILE_BYTES: u128 = 1_000_000;
const LOG_FILES_KEPT: usize = 5;

fn builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .error_handling(ErrorHandlingMode::Result)
        .commands(collect_commands![
            commands::list_manuscripts,
            commands::create_manuscript,
            commands::open_manuscript,
            commands::save_paragraphs,
            commands::export_manuscript,
            commands::list_revisions,
            commands::restore_revision,
            commands::set_title,
            commands::get_annotations,
            commands::draft_from_memo,
            commands::rewrite_remark,
            commands::dismiss_remark,
            commands::log_reaction,
            commands::list_sources,
            commands::ingest_text,
            commands::revert_source,
            commands::get_mcp,
            commands::sync_status,
            commands::begin_sync_sign_in,
            commands::source_facts,
            commands::claude_status,
            commands::onboarding_done,
            commands::complete_onboarding_step,
            commands::check_update,
            commands::install_update,
            commands::window_ready,
            commands::finish_closing,
        ])
}

fn yohaku(data: &Path, home: Option<&Path>) -> Result<Yohaku, Failure> {
    let store = Store::open(data)?;
    let claude = Claude::new(home.map(Path::to_path_buf), data.join(WORK_DIRECTORY));
    let understanding = Understanding::new(store.clone(), claude.clone());
    let syncer = Syncer::new(store.clone(), mcp::PORT)?;
    let mcp_token = mcp::token(data)?;
    Ok(Yohaku {
        store,
        claude,
        understanding,
        syncer,
        mcp_token,
    })
}

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let data = app.path().app_local_data_dir()?;
    let home = app.path().home_dir().ok();
    let state = yohaku(&data, home.as_deref()).map_err(|failure| failure.message)?;
    let serving = (
        state.store.clone(),
        state.syncer.clone(),
        state.mcp_token.clone(),
    );
    async_runtime::spawn(async move {
        let (store, syncer, token) = serving;
        if let Err(failure) = mcp::serve(store, syncer, token).await {
            log::warn!("mcp server stopped: {failure}");
        }
    });
    state.syncer.start();
    app.manage(state);
    app.manage(window::Closing::default());
    window::paint_like_the_page(app.handle());
    window::show_if_hidden_later(app.handle());
    Ok(())
}

pub fn run() -> tauri::Result<()> {
    let builder = builder();
    let app = tauri::Builder::default();
    let app = if cfg!(target_os = "macos") {
        app.menu(menu::japanese)
    } else {
        app
    };
    app.plugin(tauri_plugin_single_instance::init(
        |app, _arguments, _cwd| {
            window::show(app);
        },
    ))
    .plugin(
        tauri_plugin_log::Builder::new()
            .level(LevelFilter::Info)
            .max_file_size(LOG_FILE_BYTES)
            .rotation_strategy(RotationStrategy::KeepSome(LOG_FILES_KEPT))
            .build(),
    )
    .plugin(window::state_plugin())
    .plugin(window::browser_keys_plugin())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(builder.invoke_handler())
    .on_window_event(|window, event| {
        if window.label() != MAIN_WINDOW {
            return;
        }
        match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                window::request_close(window.app_handle(), false);
            }
            WindowEvent::Resized(_) | WindowEvent::Focused(_) => {
                window::rest_while_out_of_sight(window.app_handle());
            }
            _ => {}
        }
    })
    .setup(setup)
    .build(tauri::generate_context!())?
    .run(|app, event| match event {
        RunEvent::ExitRequested {
            code: None, api, ..
        } => {
            api.prevent_exit();
            window::request_close(app, true);
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => window::show(app),
        _ => {}
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;

    use specta_typescript::Typescript;

    use super::builder;

    const BINDINGS: &str = "../src/shared/api/generated/bindings.ts";

    #[test]
    fn typescript_bindings_are_current() {
        let committed = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(BINDINGS);
        let generated =
            std::env::temp_dir().join(format!("yohaku-bindings-{}.ts", std::process::id()));
        builder()
            .export(
                Typescript::default()
                    .header("// @generated by apps/yohaku-desktop/src-tauri. Do not edit."),
                &generated,
            )
            .expect("export bindings");
        let fresh = fs::read_to_string(&generated).expect("read generated bindings");
        if std::env::var_os("UPDATE_BINDINGS").is_some() {
            fs::write(&committed, &fresh).expect("write bindings");
        }
        let current = fs::read_to_string(&committed).unwrap_or_default();
        assert!(
            current == fresh,
            "{BINDINGS} is stale: run UPDATE_BINDINGS=1 cargo test -p yohaku-desktop"
        );
    }
}
