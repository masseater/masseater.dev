use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, ExitStatus, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Deserialize;
use tauri::async_runtime;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, RunEvent, State};
use tokio::sync::watch;
use tokio::task::AbortHandle;

pub mod chunk;
pub mod model;
pub mod prompt;
pub mod server;
pub mod translate;

use model::{Model, Progress};
use prompt::Direction;
use server::{Launch, Server};

const MAIN_WINDOW: &str = "main";
const SERVER_LOG: &str = "llama-server.log";
const STARTUP_TIMEOUT: Duration = Duration::from_mins(2);
const CANCELLED: &str = "cancelled";
const MODELS: &str = "models";
/// How often the window hears how much of the model has arrived.
const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);
const STOPPED: &str = "翻訳エンジンは停止しています";

#[cfg(windows)]
const SERVER_BINARY: &str = "llama-server.exe";
#[cfg(not(windows))]
const SERVER_BINARY: &str = "llama-server";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Where llama-server is.
pub struct Runtime {
    pub server: PathBuf,
}

impl Runtime {
    /// The runtime under `directory`, laid out as the installer and `fetch-runtime` place it.
    #[must_use]
    pub fn in_directory(directory: &Path) -> Self {
        Self {
            server: directory.join("llama").join(SERVER_BINARY),
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

/// Starts llama-server with `model` as `launch` says, writing its log to `log`.
///
/// # Errors
///
/// Returns an error when the process cannot start.
pub fn spawn_server(
    runtime: &Runtime,
    model: &Path,
    launch: &Launch,
    log: File,
) -> io::Result<Child> {
    let mut command = launch.command(&runtime.server, model);
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

/// How far the engine is from translating.
#[derive(Clone)]
enum Phase {
    Idle,
    Downloading(Progress),
    Starting,
    Ready(Server),
    Failed(String),
}

impl Phase {
    const fn settled(&self) -> bool {
        matches!(self, Self::Ready(_) | Self::Failed(_))
    }

    /// Moves to `Starting` when nothing is under way, and says whether it did.
    fn begin(&mut self) -> bool {
        let begins = matches!(self, Self::Idle | Self::Failed(_));
        if begins {
            *self = Self::Starting;
        }
        begins
    }
}

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
    phase: watch::Sender<Phase>,
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
    let mut phases = engine.phase.subscribe();
    let phase = phases
        .wait_for(Phase::settled)
        .await
        .map_err(|error| error.to_string())?;
    match &*phase {
        Phase::Ready(server) => Ok(server.clone()),
        Phase::Failed(message) => Err(message.clone()),
        Phase::Idle | Phase::Downloading(_) | Phase::Starting => Err(STOPPED.to_owned()),
    }
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

async fn start_engine(
    app: &AppHandle,
    process: &Mutex<Process>,
    model: &Path,
) -> Result<Server, String> {
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
                .replace(|| spawn_server(&runtime, model, launch, log.try_clone()?))
        },
        || process.lock().map_err(|_| Process::stopped())?.exited(),
    )
    .await
    .map_err(|error| error.to_string())
}

async fn boot(
    app: &AppHandle,
    phase: &watch::Sender<Phase>,
    process: &Mutex<Process>,
) -> Result<Server, String> {
    let models = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join(MODELS);
    let client = reqwest::Client::builder()
        .build()
        .map_err(|error| error.to_string())?;
    let model = model::ensure(&client, &Model::plamo(), &models, |progress| {
        phase.send_replace(Phase::Downloading(progress));
    })
    .await
    .map_err(|error| error.to_string())?;
    phase.send_replace(Phase::Starting);
    start_engine(app, process, &model).await
}

/// Gets the engine ready, downloading the model when it is not on the disk yet.
///
/// Calling it again after a failure tries again. Calls made while the engine is getting ready
/// wait for the same attempt.
#[tauri::command]
async fn prepare(
    app: AppHandle,
    engine: State<'_, Engine>,
    on_progress: Channel<Progress>,
) -> Result<(), String> {
    if engine.phase.send_if_modified(Phase::begin) {
        async_runtime::spawn({
            let phase = engine.phase.clone();
            let process = Arc::clone(&engine.process);
            async move {
                let settled = boot(&app, &phase, &process)
                    .await
                    .map_or_else(Phase::Failed, Phase::Ready);
                phase.send_replace(settled);
            }
        });
    }
    let mut phases = engine.phase.subscribe();
    loop {
        let phase = phases.borrow_and_update().clone();
        match phase {
            Phase::Ready(_) => return Ok(()),
            Phase::Failed(message) => return Err(message),
            Phase::Downloading(progress) => {
                let _ = on_progress.send(progress);
                tokio::time::sleep(PROGRESS_INTERVAL).await;
            }
            Phase::Idle | Phase::Starting => {}
        }
        phases.changed().await.map_err(|error| error.to_string())?;
    }
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
        .manage(Engine {
            phase: watch::Sender::new(Phase::Idle),
            process: Arc::new(Mutex::new(Process::Idle)),
            inflight: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![prepare, translate])
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

    #[test]
    fn begins_only_when_nothing_is_under_way() {
        let mut phase = Phase::Idle;
        assert!(phase.begin());
        assert!(!phase.begin());
        phase = Phase::Failed(STOPPED.to_owned());
        assert!(phase.begin());
        assert!(matches!(phase, Phase::Starting));
    }
}
