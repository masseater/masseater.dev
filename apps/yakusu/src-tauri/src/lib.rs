use std::fs::{self, File};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::Deserialize;
use tauri::async_runtime;
use tauri::ipc::Channel;
use tauri::{App, AppHandle, Manager, RunEvent, State};
use tokio::sync::watch;
use tokio::task::AbortHandle;

pub mod chunk;
pub mod prompt;
pub mod server;
pub mod translate;

use prompt::Direction;
use server::Server;

const MAIN_WINDOW: &str = "main";
const SERVER_LOG: &str = "llama-server.log";
const STARTUP_TIMEOUT: Duration = Duration::from_mins(2);
const CANCELLED: &str = "cancelled";
const STARTING: &str = "翻訳エンジンを起動しています";

#[cfg(windows)]
const SERVER_BINARY: &str = "llama-server.exe";
#[cfg(not(windows))]
const SERVER_BINARY: &str = "llama-server";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Where llama-server and the model are.
pub struct Runtime {
    pub server: PathBuf,
    pub model: PathBuf,
}

impl Runtime {
    /// The runtime under `directory`, laid out as the installer and `fetch-runtime` place it.
    #[must_use]
    pub fn in_directory(directory: &std::path::Path) -> Self {
        Self {
            server: directory.join("llama").join(SERVER_BINARY),
            model: directory.join("model.gguf"),
        }
    }
}

#[cfg(debug_assertions)]
fn runtime(_app: &AppHandle) -> Runtime {
    Runtime::in_directory(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources"))
}

#[cfg(not(debug_assertions))]
fn runtime(app: &AppHandle) -> Runtime {
    let resources = app.path().resource_dir().map_or_else(
        |_| PathBuf::from("."),
        |path| dunce::simplified(&path).to_path_buf(),
    );
    Runtime::in_directory(&resources)
}

/// Starts llama-server with the translation model on `port`, writing its log to `log`.
///
/// # Errors
///
/// Returns an error when the process cannot start.
pub fn spawn_server(runtime: &Runtime, port: u16, log: File) -> std::io::Result<Child> {
    let mut command = Command::new(&runtime.server);
    command
        .args(server::arguments(&runtime.model, port))
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command.spawn()
}

type Readiness = Option<Result<Server, String>>;

struct Engine {
    ready: watch::Receiver<Readiness>,
    child: Mutex<Option<Child>>,
    inflight: Mutex<Option<AbortHandle>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslateRequest {
    text: String,
    #[serde(flatten)]
    direction: Direction,
}

async fn ready_server(engine: &Engine) -> Result<Server, String> {
    let mut ready = engine.ready.clone();
    let readiness = ready
        .wait_for(Option::is_some)
        .await
        .map_err(|error| error.to_string())?;
    readiness
        .clone()
        .unwrap_or_else(|| Err(STARTING.to_owned()))
}

#[tauri::command]
async fn translate(
    engine: State<'_, Engine>,
    request: TranslateRequest,
    on_delta: Channel<String>,
) -> Result<(), String> {
    let server = ready_server(&engine).await?;
    let task = async_runtime::spawn(async move {
        translate::translate(
            &request.direction,
            &request.text,
            |prompt, max_tokens| server.complete(&prompt, max_tokens),
            |delta| {
                let _ = on_delta.send(delta);
            },
        )
        .await
    });
    let previous = engine
        .inflight
        .lock()
        .ok()
        .and_then(|mut slot| slot.replace(task.inner().abort_handle()));
    if let Some(previous) = previous {
        previous.abort();
    }
    task.await.map_or_else(
        |_| Err(CANCELLED.to_owned()),
        |result| result.map_err(|error| error.to_string()),
    )
}

fn start_engine(app: &AppHandle) -> Result<(Child, Server), String> {
    let logs = app
        .path()
        .app_log_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
    let log = File::create(logs.join(SERVER_LOG)).map_err(|error| error.to_string())?;
    let port = server::free_port().map_err(|error| error.to_string())?;
    let child = spawn_server(&runtime(app), port, log).map_err(|error| error.to_string())?;
    Ok((child, Server::new(port)))
}

fn stop_engine(app: &AppHandle) {
    let engine = app.state::<Engine>();
    let child = engine.child.lock().ok().and_then(|mut slot| slot.take());
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

fn setup(app: &App) {
    let (publish, ready) = watch::channel(None);
    let child = match start_engine(app.handle()) {
        Ok((child, server)) => {
            async_runtime::spawn(async move {
                let readiness = server
                    .wait_ready(STARTUP_TIMEOUT)
                    .await
                    .map(|()| server)
                    .map_err(|error| error.to_string());
                publish.send_replace(Some(readiness));
            });
            Some(child)
        }
        Err(message) => {
            publish.send_replace(Some(Err(message)));
            None
        }
    };
    app.manage(Engine {
        ready,
        child: Mutex::new(child),
        inflight: Mutex::new(None),
    });
}

/// Starts the translator window and the translation engine behind it.
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
        .setup(|app| {
            setup(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![translate])
        .build(tauri::generate_context!())?;
    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            stop_engine(app);
        }
    });
    Ok(())
}
