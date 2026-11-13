use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

use crate::failure::{Failure, Outcome};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const NOT_INSTALLED: &str =
    "Claude Code が見つかりません。Claude Code を入れてから、もう一度試してください";

pub struct Ask<'a> {
    pub system: &'a str,
    pub prompt: &'a str,
    pub model: &'a str,
    pub tools: &'a [&'a str],
    pub max_turns: u32,
    pub schema: Option<&'a Value>,
    pub streaming: bool,
}

#[derive(Clone)]
pub struct Claude {
    executable: Option<PathBuf>,
    directory: PathBuf,
}

enum Line {
    Text(String),
    Done(Value),
    Other,
}

fn arguments(ask: &Ask<'_>) -> Vec<String> {
    let tools = ask.tools.join(",");
    let mut arguments: Vec<String> = [
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--no-session-persistence",
        "--thinking=disabled",
        "--setting-sources",
        "",
        "--model",
        ask.model,
        "--system-prompt",
        ask.system,
        "--tools",
        &tools,
        "--max-turns",
    ]
    .iter()
    .map(|argument| (*argument).to_owned())
    .collect();
    arguments.push(ask.max_turns.to_string());
    if !ask.tools.is_empty() {
        arguments.extend(["--allowedTools".to_owned(), tools]);
    }
    if ask.streaming {
        arguments.push("--include-partial-messages".to_owned());
    }
    if let Some(schema) = ask.schema {
        arguments.extend(["--json-schema".to_owned(), schema.to_string()]);
    }
    arguments
}

fn text_delta(message: &Value) -> Option<String> {
    let event = message.get("event")?;
    let delta = event.get("delta")?;
    (event.get("type")? == "content_block_delta" && delta.get("type")? == "text_delta")
        .then(|| delta.get("text")?.as_str().map(str::to_owned))
        .flatten()
}

fn result_of(message: &Value) -> Outcome<Value> {
    let failed = message
        .get("is_error")
        .and_then(Value::as_bool)
        .unwrap_or(true)
        || message.get("subtype").and_then(Value::as_str) != Some("success");
    if failed {
        let reason = message
            .get("result")
            .and_then(Value::as_str)
            .or_else(|| message.get("subtype").and_then(Value::as_str))
            .unwrap_or("Claude Code が答えを返しませんでした");
        return Err(Failure::new(reason));
    }
    Ok(message
        .get("structured_output")
        .cloned()
        .unwrap_or(Value::Null))
}

fn parse(line: &str) -> Outcome<Line> {
    let Ok(message) = serde_json::from_str::<Value>(line) else {
        return Ok(Line::Other);
    };
    match message.get("type").and_then(Value::as_str) {
        Some("stream_event") => Ok(text_delta(&message).map_or(Line::Other, Line::Text)),
        Some("result") => result_of(&message).map(Line::Done),
        _ => Ok(Line::Other),
    }
}

async fn stderr_of(child: &mut Child) -> String {
    let mut text = String::new();
    if let Some(mut stderr) = child.stderr.take() {
        let _ = stderr.read_to_string(&mut text).await;
    }
    text
}

impl Claude {
    pub const fn new(executable: Option<PathBuf>, directory: PathBuf) -> Self {
        Self {
            executable,
            directory,
        }
    }

    fn command(&self, executable: &Path, ask: &Ask<'_>) -> Command {
        let mut command = Command::new(executable);
        command
            .args(arguments(ask))
            .current_dir(&self.directory)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);
        command
    }

    async fn spawned(&self, ask: &Ask<'_>) -> Outcome<Child> {
        let executable = self
            .executable
            .as_deref()
            .ok_or_else(|| Failure::new(NOT_INSTALLED))?;
        std::fs::create_dir_all(&self.directory)?;
        let mut child = self.command(executable, ask).spawn()?;
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(ask.prompt.as_bytes()).await?;
        }
        Ok(child)
    }

    pub async fn run(&self, ask: &Ask<'_>, mut on_text: impl FnMut(String)) -> Outcome<Value> {
        let mut child = self.spawned(ask).await?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| Failure::new("Claude Code の出力を読めません"))?;
        let mut lines = BufReader::new(stdout).lines();
        while let Some(line) = lines.next_line().await? {
            match parse(&line)? {
                Line::Text(text) => on_text(text),
                Line::Done(value) => return Ok(value),
                Line::Other => {}
            }
        }
        let problem = stderr_of(&mut child).await;
        let _ = child.wait().await;
        Err(Failure::new(if problem.trim().is_empty() {
            "Claude Code が途中で終わりました".to_owned()
        } else {
            problem.trim().to_owned()
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::{Line, parse};

    #[test]
    fn reads_text_deltas_and_the_structured_result() {
        let delta = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"雨"}}}"#;
        assert!(matches!(parse(delta), Ok(Line::Text(text)) if text == "雨"));
        let done = r#"{"type":"result","subtype":"success","is_error":false,"result":"","structured_output":{"title":"雨"}}"#;
        assert!(matches!(parse(done), Ok(Line::Done(value)) if value["title"] == "雨"));
    }

    #[test]
    fn turns_an_error_result_into_a_failure() {
        let failed = r#"{"type":"result","subtype":"error_max_turns","is_error":true}"#;
        assert!(parse(failed).is_err_and(|failure| failure.message == "error_max_turns"));
    }
}
