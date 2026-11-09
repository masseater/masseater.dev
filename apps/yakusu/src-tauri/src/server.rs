use std::ffi::OsString;
use std::io;
use std::net::{Ipv4Addr, TcpListener};
use std::path::Path;
use std::time::{Duration, Instant};

use futures_util::{Stream, StreamExt, TryStreamExt, stream};
use serde::{Deserialize, Serialize};

use crate::prompt::STOP;
use crate::translate::Error;

const HOST: Ipv4Addr = Ipv4Addr::LOCALHOST;
const CONTEXT_TOKENS: &str = "16384";
const POLL_INTERVAL: Duration = Duration::from_millis(250);
/// llama-server may close a kept-alive connection just as the next request reuses it.
const IDLE_CONNECTIONS: usize = 0;

/// The arguments that start llama-server with the translation model on `port`.
#[must_use]
pub fn arguments(model: &Path, port: u16) -> Vec<OsString> {
    vec![
        "--model".into(),
        model.into(),
        "--host".into(),
        HOST.to_string().into(),
        "--port".into(),
        port.to_string().into(),
        "--ctx-size".into(),
        CONTEXT_TOKENS.into(),
        "--parallel".into(),
        "1".into(),
        "--no-ui".into(),
    ]
}

/// A local port that nothing listens on right now.
///
/// # Errors
///
/// Returns an error when the operating system cannot open a socket.
pub fn free_port() -> io::Result<u16> {
    Ok(TcpListener::bind((HOST, 0))?.local_addr()?.port())
}

#[derive(Serialize)]
struct Completion<'a> {
    prompt: &'a str,
    n_predict: usize,
    temperature: f32,
    stop: [&'static str; 2],
    stream: bool,
    cache_prompt: bool,
}

#[derive(Deserialize)]
struct Event {
    #[serde(default)]
    content: String,
    error: Option<serde_json::Value>,
}

/// Reads the server-sent events of a streamed completion and returns the generated text.
#[derive(Default)]
pub struct Decoder {
    pending: Vec<u8>,
}

impl Decoder {
    /// Takes the next bytes of the response and returns the text deltas whose events are complete.
    ///
    /// # Errors
    ///
    /// Returns an error when an event is not JSON or reports an error.
    pub fn push(&mut self, bytes: &[u8]) -> Result<Vec<String>, Error> {
        self.pending.extend_from_slice(bytes);
        let mut deltas = Vec::new();
        while let Some(newline) = self.pending.iter().position(|&byte| byte == b'\n') {
            let line: Vec<u8> = self.pending.drain(..=newline).collect();
            let line = String::from_utf8_lossy(&line);
            let Some(data) = line.trim_end().strip_prefix("data:") else {
                continue;
            };
            let event: Event = serde_json::from_str(data.trim_start())
                .map_err(|error| Error::Server(error.to_string()))?;
            if let Some(error) = event.error {
                return Err(Error::Server(error.to_string()));
            }
            if !event.content.is_empty() {
                deltas.push(event.content);
            }
        }
        Ok(deltas)
    }
}

fn server_error(error: &reqwest::Error) -> Error {
    Error::Server(error.to_string())
}

/// A running llama-server.
#[derive(Clone)]
pub struct Server {
    base: String,
    client: reqwest::Client,
}

impl Server {
    #[must_use]
    pub fn new(port: u16) -> Self {
        Self {
            base: format!("http://{HOST}:{port}"),
            client: reqwest::Client::builder()
                .pool_max_idle_per_host(IDLE_CONNECTIONS)
                .build()
                .unwrap_or_default(),
        }
    }

    /// Waits until the server has loaded the model.
    ///
    /// # Errors
    ///
    /// Returns an error when the server is not ready within `timeout`.
    pub async fn wait_ready(&self, timeout: Duration) -> Result<(), Error> {
        let deadline = Instant::now() + timeout;
        loop {
            let ready = self
                .client
                .get(format!("{}/health", self.base))
                .send()
                .await
                .is_ok_and(|response| response.status().is_success());
            if ready {
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err(Error::Server("翻訳エンジンが起動しません".to_owned()));
            }
            tokio::time::sleep(POLL_INTERVAL).await;
        }
    }

    /// Streams the text the model generates for `prompt`.
    pub fn complete(
        &self,
        prompt: &str,
        max_tokens: usize,
    ) -> impl Stream<Item = Result<String, Error>> + Send + 'static + use<> {
        let request = self
            .client
            .post(format!("{}/completion", self.base))
            .json(&Completion {
                prompt,
                n_predict: max_tokens,
                temperature: 0.0,
                stop: STOP,
                stream: true,
                cache_prompt: true,
            });
        stream::once(async move {
            let response = request.send().await.map_err(|error| server_error(&error))?;
            let status = response.status();
            if !status.is_success() {
                let body = response.text().await.unwrap_or_default();
                return Err(Error::Server(format!("{status}: {body}")));
            }
            let mut decoder = Decoder::default();
            Ok(response
                .bytes_stream()
                .map(move |bytes| {
                    let deltas = bytes
                        .map_err(|error| server_error(&error))
                        .and_then(|bytes| decoder.push(&bytes));
                    stream::iter(match deltas {
                        Ok(deltas) => deltas.into_iter().map(Ok).collect(),
                        Err(error) => vec![Err(error)],
                    })
                })
                .flatten())
        })
        .try_flatten()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_the_server_on_localhost_with_one_slot() {
        let arguments = arguments(Path::new("model.gguf"), 8080);
        let arguments: Vec<_> = arguments
            .iter()
            .map(|argument| argument.to_str().unwrap())
            .collect();
        assert_eq!(
            arguments,
            [
                "--model",
                "model.gguf",
                "--host",
                "127.0.0.1",
                "--port",
                "8080",
                "--ctx-size",
                "16384",
                "--parallel",
                "1",
                "--no-ui"
            ]
        );
    }

    #[test]
    fn decodes_deltas_split_across_chunks() {
        let mut decoder = Decoder::default();
        let first = "data: {\"content\":\"The\",\"stop\":false}\n\ndata: {\"content\":\" mee";
        assert_eq!(decoder.push(first.as_bytes()).unwrap(), ["The"]);
        let second = "ting\",\"stop\":false}\n\ndata: {\"content\":\"\",\"stop\":true}\n\n";
        assert_eq!(decoder.push(second.as_bytes()).unwrap(), [" meeting"]);
    }

    #[test]
    fn keeps_multibyte_characters_split_across_chunks() {
        let mut decoder = Decoder::default();
        let event = "data: {\"content\":\"会議\"}\n".as_bytes();
        let (head, tail) = event.split_at(22);
        assert_eq!(decoder.push(head).unwrap(), Vec::<String>::new());
        assert_eq!(decoder.push(tail).unwrap(), ["会議"]);
    }

    #[test]
    fn reports_an_error_event() {
        let mut decoder = Decoder::default();
        let event = b"data: {\"error\":{\"code\":500,\"message\":\"boom\"}}\n";
        assert!(
            matches!(decoder.push(event), Err(Error::Server(message)) if message.contains("boom"))
        );
    }

    #[test]
    fn finds_a_free_port() {
        assert_ne!(free_port().unwrap(), 0);
    }
}
