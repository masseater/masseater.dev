use std::fs::{self, File};
use std::io;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::shared::protocol;

const SERVER_LOG: &str = "server.log";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub struct Server(pub Mutex<Option<Child>>);

struct Entry {
    node: PathBuf,
    script: PathBuf,
    models: Option<PathBuf>,
}

#[cfg(debug_assertions)]
fn debug_script() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("aredoko-server/src/app/main.ts")
}

#[cfg(debug_assertions)]
fn entry(_app: &AppHandle) -> Entry {
    Entry {
        node: PathBuf::from("node"),
        script: debug_script(),
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

pub fn spawn_server(app: &AppHandle) -> tauri::Result<Child> {
    let data = app.path().app_local_data_dir()?;
    let logs = app.path().app_log_dir()?;
    fs::create_dir_all(&logs)?;
    let log = File::create(logs.join(SERVER_LOG))?;
    let Entry {
        node,
        script,
        models,
    } = entry(app);
    if !script.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("server script not found: {}", script.display()),
        )
        .into());
    }
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

pub fn stop_server(app: &AppHandle) {
    let server = app.state::<Server>();
    let child = server.0.lock().ok().and_then(|mut slot| slot.take());
    if let Some(mut child) = child {
        let _ = child.kill();
        let _ = child.wait();
    }
}

#[cfg(all(test, debug_assertions))]
mod tests {
    use super::debug_script;

    #[test]
    fn debug_entry_script_exists() {
        let script = debug_script();
        assert!(script.is_file(), "{} is not a file", script.display());
    }
}
