use std::fs::{self, File};
use std::io;
use std::path::PathBuf;
use std::process::{Child, ExitStatus, Stdio};
use std::sync::{Arc, Mutex};
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
use server::{Launch, Server};

const MAIN_WINDOW: &str = "main";
const SERVER_LOG: &str = "llama-server.log";
const STARTUP_TIMEOUT: Duration = Duration::from_mins(2);
const CANCELLED: &str = "cancelled";
const STARTING: &str = "翻訳エンジンを起動しています";
const STOPPED: &str = "翻訳エンジンは停止しています";

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

/// Starts llama-server with the translation model as `launch` says, writing its log to `log`.
///
/// # Errors
///
/// Returns an error when the process cannot start.
pub fn spawn_server(runtime: &Runtime, launch: &Launch, log: File) -> io::Result<Child> {
    let mut command = launch.command(&runtime.server, &runtime.model);
    command
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

/// The llama-server process. Once the app has stopped it, no other is started.
enum Process {
    Idle,
    Running(Child),
    Stopped,
}

impl Process {
    fn stopped() -> io::Error {
        io::Error::other(STOPPED)
    }

    fn kill(&mut self) {
        if let Self::Running(child) = self {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    fn stop(&mut self) {
        self.kill();
        *self = Self::Stopped;
    }

    fn replace(&mut self, spawn: impl FnOnce() -> io::Result<Child>) -> io::Result<()> {
        if matches!(self, Self::Stopped) {
            return Err(Self::stopped());
        }
        self.kill();
        *self = Self::Running(spawn()?);
        Ok(())
    }

    fn exited(&mut self) -> io::Result<Option<ExitStatus>> {
        match self {
            Self::Running(child) => child.try_wait(),
            Self::Idle | Self::Stopped => Err(Self::stopped()),
        }
    }
}

struct Engine {
    ready: watch::Receiver<Readiness>,
    process: Arc<Mutex<Process>>,
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

async fn start_engine(app: &AppHandle, process: &Mutex<Process>) -> Result<Server, String> {
    let logs = app
        .path()
        .app_log_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
    let log = File::create(logs.join(SERVER_LOG)).map_err(|error| error.to_string())?;
    let runtime = runtime(app);
    server::start(
        STARTUP_TIMEOUT,
        |launch| {
            process
                .lock()
                .map_err(|_| Process::stopped())?
                .replace(|| spawn_server(&runtime, launch, log.try_clone()?))
        },
        || process.lock().map_err(|_| Process::stopped())?.exited(),
    )
    .await
    .map_err(|error| error.to_string())
}

fn stop_engine(app: &AppHandle) {
    let engine = app.state::<Engine>();
    if let Ok(mut process) = engine.process.lock() {
        process.stop();
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
    let process = Arc::new(Mutex::new(Process::Idle));
    async_runtime::spawn({
        let app = app.handle().clone();
        let process = Arc::clone(&process);
        async move {
            let readiness = start_engine(&app, &process).await;
            publish.send_replace(Some(readiness));
        }
    });
    app.manage(Engine {
        ready,
        process,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_no_process_once_the_app_has_stopped_it() {
        let mut process = Process::Idle;
        process.stop();
        assert!(
            process
                .replace(|| unreachable!("spawned after the stop"))
                .is_err()
        );
        assert!(process.exited().is_err());
    }
}
