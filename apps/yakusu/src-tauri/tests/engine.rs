use std::fs::File;
use std::io;
use std::path::PathBuf;
use std::process::{Child, ExitStatus};
use std::sync::Mutex;
use std::time::Duration;

use reqwest::StatusCode;
use yakusu::model::{self, Model};
use yakusu::prompt::{Direction, Form, Lang};
use yakusu::server::{self, Server};
use yakusu::{Runtime, spawn_server, translate};

#[derive(Default)]
struct Process {
    child: Option<Child>,
    port: u16,
}

impl Process {
    fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    fn replace(&mut self, child: Child, port: u16) {
        self.stop();
        self.child = Some(child);
        self.port = port;
    }

    fn exited(&mut self) -> io::Result<Option<ExitStatus>> {
        self.child.as_mut().map_or(Ok(None), Child::try_wait)
    }
}

impl Drop for Process {
    fn drop(&mut self) {
        self.stop();
    }
}

struct Running {
    process: Process,
    server: Server,
}

async fn start() -> Running {
    let resources = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources");
    let runtime = Runtime::in_directory(&resources);
    let model = model::ensure(
        &reqwest::Client::new(),
        &Model::plamo(),
        &resources.join("models"),
        |_| {},
    )
    .await
    .unwrap();
    let log = File::create(std::env::temp_dir().join("yakusu-engine-test.log")).unwrap();
    let process = Mutex::new(Process::default());
    let server = server::start(
        Duration::from_mins(2),
        |launch| {
            let child = spawn_server(&runtime, &model, launch, log.try_clone()?)?;
            process.lock().unwrap().replace(child, launch.port());
            Ok(())
        },
        || process.lock().unwrap().exited(),
    )
    .await
    .unwrap();
    Running {
        process: process.into_inner().unwrap(),
        server,
    }
}

fn lang(code: &str) -> Lang {
    Lang::try_from(code.to_owned()).unwrap()
}

async fn run(running: &Running, direction: &Direction, text: &str) -> String {
    let mut output = String::new();
    translate::translate(
        direction,
        text,
        |prompt, max_tokens| running.server.complete(&prompt, max_tokens),
        |delta| output.push_str(&delta),
    )
    .await
    .unwrap();
    output
}

#[tokio::test]
#[ignore = "needs llama-server in resources/, which fetch-runtime downloads, and downloads the model"]
async fn translates_with_the_downloaded_model() {
    let running = start().await;

    let keyless = reqwest::get(format!("http://127.0.0.1:{}/props", running.process.port))
        .await
        .unwrap();
    assert_eq!(keyless.status(), StatusCode::UNAUTHORIZED);

    let english = run(
        &running,
        &Direction {
            source: None,
            target: lang("en"),
            form: None,
        },
        "会議は来週の月曜日に変更されました。",
    )
    .await;
    assert!(english.contains("Monday"), "{english}");

    let polite = run(
        &running,
        &Direction {
            source: Some(lang("en")),
            target: lang("ja"),
            form: Some(Form::Polite),
        },
        "Thank you.\n\nSee you tomorrow.",
    )
    .await;
    assert!(polite.contains("ありがとう"), "{polite}");
    assert!(polite.contains("\n\n"), "{polite}");
}
