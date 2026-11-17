use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::async_runtime;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};
use tokio::sync::watch;

use crate::entities::engine::{
    Engine, Launch, Model, Phase, Process, Progress, Server, ensure, start,
};

const SERVER_LOG: &str = "llama-server.log";
const STARTUP_TIMEOUT: Duration = Duration::from_mins(2);
const MODELS: &str = "models";
const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);

#[cfg(windows)]
const SERVER_BINARY: &str = "llama-server.exe";
#[cfg(not(windows))]
const SERVER_BINARY: &str = "llama-server";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub struct Runtime {
    pub server: PathBuf,
}

impl Runtime {
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
    start(
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
    let model = ensure(&client, &Model::plamo(), &models, |progress| {
        phase.send_replace(Phase::Downloading(progress));
    })
    .await
    .map_err(|error| error.to_string())?;
    phase.send_replace(Phase::Starting);
    start_engine(app, process, &model).await
}

#[tauri::command]
pub async fn prepare(
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

#[cfg(test)]
mod tests;
