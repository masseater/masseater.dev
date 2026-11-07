use std::fs::{self, File};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

mod protocol;

const MAIN_WINDOW: &str = "main";
const HIDDEN_FLAG: &str = "--hidden";
const SERVER_LOG: &str = "server.log";
const OPEN_ITEM: &str = "open";
const QUIT_ITEM: &str = "quit";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct Server(Mutex<Option<Child>>);

struct Entry {
    node: PathBuf,
    script: PathBuf,
    models: Option<PathBuf>,
}

#[cfg(debug_assertions)]
fn entry(_app: &AppHandle) -> Entry {
    let repository = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    Entry {
        node: PathBuf::from("node"),
        script: repository.join("server/src/app/main.ts"),
        models: None,
    }
}

#[cfg(not(debug_assertions))]
fn entry(app: &AppHandle) -> Entry {
    let resources = app.path().resource_dir().map_or_else(
        |_| PathBuf::from("."),
        |path| dunce::simplified(&path).to_path_buf(),
    );
    Entry {
        node: resources.join("runtime/node.exe"),
        script: resources.join("server/main.mjs"),
        models: Some(resources.join("models")),
    }
}

fn spawn_server(app: &AppHandle) -> tauri::Result<Child> {
    let data = app.path().app_local_data_dir()?;
    let logs = app.path().app_log_dir()?;
    fs::create_dir_all(&logs)?;
    let log = File::create(logs.join(SERVER_LOG))?;
    let Entry {
        node,
        script,
        models,
    } = entry(app);
    let mut command = Command::new(node);
    command
        .arg(script)
        .arg(protocol::DATA_DIRECTORY_FLAG)
        .arg(data)
        .arg(protocol::PARENT_PID_FLAG)
        .arg(std::process::id().to_string())
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log);
    if let Some(models) = models {
        command.arg(protocol::MODEL_DIRECTORY_FLAG).arg(models);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    Ok(command.spawn()?)
}

fn stop_server(app: &AppHandle) {
    let server = app.state::<Server>();
    let child = server.0.lock().ok().and_then(|mut slot| slot.take());
    if let Some(mut child) = child {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn build_tray(app: &App) -> tauri::Result<()> {
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

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let child = spawn_server(app.handle())?;
    app.manage(Server(Mutex::new(Some(child))));
    build_tray(app)?;
    if std::env::args().any(|argument| argument == HIDDEN_FLAG)
        && let Some(window) = app.get_webview_window(MAIN_WINDOW)
    {
        window.hide()?;
    }
    Ok(())
}

/// Starts the aredoko management app, which keeps the search server running while it is open.
///
/// # Errors
///
/// Returns an error when Tauri cannot create the window or run the event loop.
pub fn run() -> tauri::Result<()> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _cwd| {
                show_main(app);
            },
        ))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![HIDDEN_FLAG]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup)
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())?;
    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            stop_server(app);
        }
    });
    Ok(())
}
