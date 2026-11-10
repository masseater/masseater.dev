use std::ffi::OsString;
use std::fmt::{self, Write as _};
use std::io;
use std::net::{Ipv4Addr, TcpListener};
use std::path::Path;
use std::process::{Command, ExitStatus};
use std::time::{Duration, Instant};

use futures_util::{Stream, StreamExt, TryStreamExt, stream};
use reqwest::{Method, RequestBuilder, StatusCode};
use serde::{Deserialize, Serialize};

use crate::prompt::STOP;
use crate::translate::Error;

const HOST: Ipv4Addr = Ipv4Addr::LOCALHOST;
const CONTEXT_TOKENS: &str = "16384";
const POLL_INTERVAL: Duration = Duration::from_millis(250);
/// llama-server may close a kept-alive connection just as the next request reuses it.
const IDLE_CONNECTIONS: usize = 0;
/// The environment variable llama-server reads its API key from.
const KEY_VARIABLE: &str = "LLAMA_API_KEY";
const KEY_BYTES: usize = 32;
/// How many times llama-server is started before giving up on finding a port of its own.
const START_ATTEMPTS: usize = 3;
/// llama-server answers this path without asking for the key.
const HEALTH: &str = "/health";
const PROPS: &str = "/props";
const COMPLETION: &str = "/completion";

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

fn fresh_key() -> io::Result<String> {
    let mut bytes = [0_u8; KEY_BYTES];
    getrandom::fill(&mut bytes).map_err(io::Error::other)?;
    Ok(bytes
        .iter()
        .fold(String::with_capacity(KEY_BYTES * 2), |mut key, byte| {
            let _ = write!(key, "{byte:02x}");
            key
        }))
}

/// One start of llama-server: the port it listens on and the key it asks for.
pub struct Launch {
    port: u16,
    key: String,
}

impl Launch {
    /// Picks a free port and makes a key that no other start has.
    ///
    /// # Errors
    ///
    /// Returns an error when the operating system cannot open a socket or give random bytes.
    pub fn new() -> io::Result<Self> {
        Ok(Self {
            port: free_port()?,
            key: fresh_key()?,
        })
    }

    /// The port llama-server is told to listen on.
    #[must_use]
    pub const fn port(&self) -> u16 {
        self.port
    }

    /// The command that runs `program` as llama-server with the translation model.
    ///
    /// The key goes into the environment of the process and not into its arguments, because
    /// every user of the computer can read the arguments of a running process.
    #[must_use]
    pub fn command(&self, program: &Path, model: &Path) -> Command {
        let mut command = Command::new(program);
        command
            .args(arguments(model, self.port))
            .env(KEY_VARIABLE, &self.key);
        command
    }

    fn server(&self) -> Server {
        Server {
            base: format!("http://{HOST}:{}", self.port),
            key: self.key.clone(),
            client: reqwest::Client::builder()
                .pool_max_idle_per_host(IDLE_CONNECTIONS)
                .build()
                .unwrap_or_default(),
        }
    }

    fn lost_port(&self, error: &StartError) -> bool {
        match error {
            StartError::Rejected(_) => true,
            StartError::Exited(_) => TcpListener::bind((HOST, self.port))
                .is_err_and(|error| error.kind() == io::ErrorKind::AddrInUse),
            StartError::Process(_) | StartError::TimedOut => false,
        }
    }
}

/// The reason llama-server did not become ready.
#[derive(Debug)]
pub enum StartError {
    /// The process could not be started or looked at.
    Process(io::Error),
    /// The process ended before it was ready.
    Exited(ExitStatus),
    /// What answers on the port does not take the key, so it is not the process that was started.
    Rejected(StatusCode),
    /// The model was not loaded in time.
    TimedOut,
}

impl fmt::Display for StartError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Process(error) => error.fmt(formatter),
            Self::Exited(status) => {
                write!(
                    formatter,
                    "翻訳エンジンが起動の途中で終了しました（{status}）"
                )
            }
            Self::Rejected(status) => write!(
                formatter,
                "翻訳エンジンのポートで別のプログラムが応答しています（{status}）"
            ),
            Self::TimedOut => formatter.write_str("翻訳エンジンが起動しません"),
        }
    }
}

impl std::error::Error for StartError {}

/// Starts llama-server through `spawn` and waits until it has loaded the model.
///
/// `exited` gives the exit status of the process that `spawn` started last, or `None` while it
/// runs. When another program took the port before llama-server could listen on it, `spawn` is
/// called again with another port and key, and has to stop the process it started before.
///
/// # Errors
///
/// Returns an error when the process cannot start, ends before it is ready, is not ready within
/// `timeout`, or still has no port of its own after a few starts.
pub async fn start(
    timeout: Duration,
    mut spawn: impl FnMut(&Launch) -> io::Result<()>,
    mut exited: impl FnMut() -> io::Result<Option<ExitStatus>>,
) -> Result<Server, StartError> {
    let mut retries = START_ATTEMPTS - 1;
    loop {
        let launch = Launch::new().map_err(StartError::Process)?;
        spawn(&launch).map_err(StartError::Process)?;
        let server = launch.server();
        match server.wait_ready(timeout, &mut exited).await {
            Ok(()) => return Ok(server),
            Err(error) if retries > 0 && launch.lost_port(&error) => retries -= 1,
            Err(error) => return Err(error),
        }
    }
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

/// A running llama-server and the key it asks for.
#[derive(Clone)]
pub struct Server {
    base: String,
    key: String,
    client: reqwest::Client,
}

impl Server {
    fn request(&self, method: Method, path: &str) -> RequestBuilder {
        self.client
            .request(method, format!("{}{path}", self.base))
            .bearer_auth(&self.key)
    }

    async fn status(&self, path: &str) -> Option<StatusCode> {
        self.request(Method::GET, path)
            .send()
            .await
            .ok()
            .map(|response| response.status())
    }

    /// Waits until the server has loaded the model and takes the key.
    ///
    /// llama-server answers the health check without the key, so a second request that needs
    /// the key shows that the listener on the port is the process that was given the key.
    async fn wait_ready(
        &self,
        timeout: Duration,
        mut exited: impl FnMut() -> io::Result<Option<ExitStatus>>,
    ) -> Result<(), StartError> {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(status) = exited().map_err(StartError::Process)? {
                return Err(StartError::Exited(status));
            }
            let healthy = self.status(HEALTH).await;
            if healthy.is_some_and(|status| status.is_success()) {
                match self.status(PROPS).await {
                    Some(status) if status.is_success() => return Ok(()),
                    Some(status) => return Err(StartError::Rejected(status)),
                    None => {}
                }
            }
            if Instant::now() >= deadline {
                return Err(StartError::TimedOut);
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
        let request = self.request(Method::POST, COMPLETION).json(&Completion {
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
    use std::cell::{Cell, RefCell};
    use std::io::{BufRead, BufReader, Read, Write};
    use std::net::TcpStream;
    use std::process::{Child, Stdio};
    use std::sync::{Arc, Mutex};
    use std::thread;

    use super::*;

    const MODEL: &str = "model.gguf";
    const STARTUP: Duration = Duration::from_mins(2);
    const AT_ONCE: Duration = Duration::from_secs(30);
    const OTHER_KEY: &str = "the key of another process";

    type Seen = Arc<Mutex<Vec<(String, Option<String>)>>>;

    fn exiting_child() -> Child {
        Command::new(std::env::current_exe().unwrap())
            .arg("--help")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap()
    }

    fn exit_status() -> ExitStatus {
        exiting_child().wait().unwrap()
    }

    fn listen(launch: &Launch) -> io::Result<TcpListener> {
        TcpListener::bind((HOST, launch.port))
    }

    fn answer(stream: TcpStream, expected: &str, seen: &Seen) {
        let mut reader = BufReader::new(stream);
        let mut line = String::new();
        reader.read_line(&mut line).unwrap();
        let path = line.split(' ').nth(1).unwrap().to_owned();
        let mut authorization = None;
        let mut length = 0;
        loop {
            line.clear();
            reader.read_line(&mut line).unwrap();
            let Some((name, value)) = line.trim_end().split_once(": ") else {
                break;
            };
            match name.to_ascii_lowercase().as_str() {
                "authorization" => authorization = Some(value.to_owned()),
                "content-length" => length = value.parse().unwrap(),
                _ => {}
            }
        }
        let mut body = vec![0; length];
        reader.read_exact(&mut body).unwrap();
        let (status, body) = if path == HEALTH {
            ("200 OK", "{\"status\":\"ok\"}")
        } else if authorization.as_deref() != Some(expected) {
            ("401 Unauthorized", "{}")
        } else if path == COMPLETION {
            ("200 OK", "data: {\"content\":\"Hi\"}\n\n")
        } else {
            ("200 OK", "{}")
        };
        seen.lock().unwrap().push((path, authorization));
        write!(
            reader.get_mut(),
            "HTTP/1.1 {status}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
    }

    fn serve(listener: TcpListener, key: &str) -> Seen {
        let seen = Seen::default();
        let record = Arc::clone(&seen);
        let expected = format!("Bearer {key}");
        thread::spawn(move || {
            for stream in listener.incoming() {
                answer(stream.unwrap(), &expected, &record);
            }
        });
        seen
    }

    #[test]
    fn starts_the_server_on_localhost_with_one_slot() {
        let arguments = arguments(Path::new(MODEL), 8080);
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
    fn hands_each_start_its_own_key_in_the_environment_and_not_in_the_arguments() {
        let keys = [Launch::new().unwrap(), Launch::new().unwrap()].map(|launch| {
            let command = launch.command(Path::new("llama-server"), Path::new(MODEL));
            let variables: Vec<_> = command.get_envs().collect();
            let [(name, Some(key))] = variables[..] else {
                panic!("{variables:?}");
            };
            let key = key.to_str().unwrap().to_owned();
            assert_eq!(name, KEY_VARIABLE);
            assert_eq!(key.len(), KEY_BYTES * 2);
            assert!(key.bytes().all(|byte| byte.is_ascii_hexdigit()), "{key}");
            assert_eq!(
                command.get_args().collect::<Vec<_>>(),
                arguments(Path::new(MODEL), launch.port)
            );
            assert!(
                command
                    .get_args()
                    .all(|argument| !argument.to_str().unwrap().contains(&key))
            );
            key
        });
        assert_ne!(keys[0], keys[1]);
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

    #[tokio::test]
    async fn fails_at_once_when_the_process_has_exited() {
        let mut child = exiting_child();
        let server = Launch::new().unwrap().server();
        let started = Instant::now();
        let result = server.wait_ready(STARTUP, || child.try_wait()).await;
        let waited = started.elapsed();
        let exited = child.wait().unwrap();
        assert!(
            matches!(result, Err(StartError::Exited(status)) if status == exited),
            "{result:?}"
        );
        assert!(waited < AT_ONCE, "{waited:?}");
    }

    #[tokio::test]
    async fn gives_up_when_the_server_is_not_ready_in_time() {
        let server = Launch::new().unwrap().server();
        let error = server
            .wait_ready(Duration::ZERO, || Ok(None))
            .await
            .unwrap_err();
        assert!(matches!(error, StartError::TimedOut), "{error:?}");
        assert_eq!(error.to_string(), "翻訳エンジンが起動しません");
    }

    #[tokio::test]
    async fn sends_the_key_with_every_request() {
        let launch = Launch::new().unwrap();
        let seen = serve(listen(&launch).unwrap(), &launch.key);
        let server = launch.server();
        server.wait_ready(STARTUP, || Ok(None)).await.unwrap();
        let deltas: Vec<_> = server.complete("prompt", 1).collect().await;
        assert_eq!(deltas, [Ok("Hi".to_owned())]);
        let authorization = Some(format!("Bearer {}", launch.key));
        let seen = seen.lock().unwrap().clone();
        assert_eq!(
            seen,
            [HEALTH, PROPS, COMPLETION].map(|path| (path.to_owned(), authorization.clone()))
        );
    }

    #[tokio::test]
    async fn refuses_a_listener_that_does_not_take_the_key() {
        let launch = Launch::new().unwrap();
        let seen = serve(listen(&launch).unwrap(), OTHER_KEY);
        let result = launch.server().wait_ready(STARTUP, || Ok(None)).await;
        assert!(
            matches!(result, Err(StartError::Rejected(StatusCode::UNAUTHORIZED))),
            "{result:?}"
        );
        assert_eq!(seen.lock().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn starts_again_on_another_port_when_the_port_was_taken() {
        let exited = exit_status();
        let taken = RefCell::new(Vec::new());
        let ports = RefCell::new(Vec::new());
        let server = start(
            STARTUP,
            |launch| {
                let listener = listen(launch)?;
                if ports.borrow().is_empty() {
                    taken.borrow_mut().push(listener);
                } else {
                    serve(listener, &launch.key);
                }
                ports.borrow_mut().push(launch.port);
                Ok(())
            },
            || Ok((ports.borrow().len() == 1).then_some(exited)),
        )
        .await
        .unwrap();
        let ports = ports.into_inner();
        assert_eq!(ports.len(), 2);
        assert_ne!(ports[0], ports[1]);
        let deltas: Vec<_> = server.complete("prompt", 1).collect().await;
        assert_eq!(deltas, [Ok("Hi".to_owned())]);
    }

    #[tokio::test]
    async fn starts_again_on_another_port_when_another_program_answers() {
        let starts = Cell::new(0);
        let server = start(
            STARTUP,
            |launch| {
                let key = if starts.get() == 0 {
                    OTHER_KEY
                } else {
                    &launch.key
                };
                serve(listen(launch)?, key);
                starts.set(starts.get() + 1);
                Ok(())
            },
            || Ok(None),
        )
        .await
        .unwrap();
        assert_eq!(starts.get(), 2);
        let deltas: Vec<_> = server.complete("prompt", 1).collect().await;
        assert_eq!(deltas, [Ok("Hi".to_owned())]);
    }

    #[tokio::test]
    async fn gives_up_after_a_few_starts_when_every_port_is_taken() {
        let exited = exit_status();
        let taken = RefCell::new(Vec::new());
        let result = start(
            STARTUP,
            |launch| {
                taken.borrow_mut().push(listen(launch)?);
                Ok(())
            },
            || Ok(Some(exited)),
        )
        .await;
        assert!(matches!(result.err(), Some(StartError::Exited(status)) if status == exited));
        assert_eq!(taken.borrow().len(), START_ATTEMPTS);
    }

    #[tokio::test]
    async fn does_not_start_again_when_the_process_ended_for_another_reason() {
        let exited = exit_status();
        let starts = Cell::new(0);
        let result = start(
            STARTUP,
            |_| {
                starts.set(starts.get() + 1);
                Ok(())
            },
            || Ok(Some(exited)),
        )
        .await;
        assert!(matches!(result.err(), Some(StartError::Exited(status)) if status == exited));
        assert_eq!(starts.get(), 1);
    }
}
