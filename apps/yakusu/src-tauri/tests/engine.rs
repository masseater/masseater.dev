use std::fs::File;
use std::path::PathBuf;
use std::process::Child;
use std::time::Duration;

use yakusu::prompt::{Direction, Form, Lang};
use yakusu::server::{self, Server};
use yakusu::{Runtime, spawn_server, translate};

struct Running {
    child: Child,
    server: Server,
}

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

async fn start() -> Running {
    let runtime =
        Runtime::in_directory(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources"));
    let port = server::free_port().unwrap();
    let log = File::create(std::env::temp_dir().join("yakusu-engine-test.log")).unwrap();
    let child = spawn_server(&runtime, port, log).unwrap();
    let server = Server::new(port);
    let running = Running { child, server };
    running
        .server
        .wait_ready(Duration::from_mins(2))
        .await
        .unwrap();
    running
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
#[ignore = "needs llama-server and the model in resources/, which fetch-runtime downloads"]
async fn translates_with_the_bundled_model() {
    let running = start().await;

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
