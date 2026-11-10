use std::fmt::{self, Write as _};
use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Seek, Write};
use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use reqwest::header::RANGE;
use reqwest::{Client, StatusCode};
use serde::Serialize;
use sha2::{Digest, Sha256};

const READ_BUFFER: usize = 1 << 16;

/// A model file on the network, pinned to the bytes it has to have.
pub struct Model {
    pub url: String,
    pub sha256: String,
    pub size: u64,
}

impl Model {
    /// `PLaMo` 3 Translate 0.8B, quantized to `Q4_K_M`, at a fixed revision.
    #[must_use]
    pub fn plamo() -> Self {
        Self {
            url: "https://huggingface.co/pfnet/plamo-3-translate-0.8b-GGUF/resolve/1cf96ae02133958a20074bfdfab76517bb737d00/plamo-3-translate-0.8b-Q4_K_M.gguf".to_owned(),
            sha256: "70891ec70dc7ab4205745a38307867c2881b99239f20327927633abfe4bc9ec6".to_owned(),
            size: 573_126_848,
        }
    }

    fn file(&self, directory: &Path) -> PathBuf {
        directory.join(format!("{}.gguf", self.sha256))
    }

    fn partial(&self, directory: &Path) -> PathBuf {
        directory.join(format!("{}.part", self.sha256))
    }
}

/// How much of the model has arrived.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct Progress {
    pub received: u64,
    pub total: u64,
}

/// The reason the model is not on the disk.
#[derive(Debug)]
pub enum Error {
    File(io::Error),
    Network(reqwest::Error),
    Status(StatusCode),
    Checksum,
}

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::File(error) => write!(formatter, "モデルを保存できません（{error}）"),
            Self::Network(error) => write!(formatter, "モデルを取得できません（{error}）"),
            Self::Status(status) => write!(formatter, "モデルを取得できません（{status}）"),
            Self::Checksum => formatter.write_str("取得したモデルが壊れています"),
        }
    }
}

impl std::error::Error for Error {}

impl From<io::Error> for Error {
    fn from(error: io::Error) -> Self {
        Self::File(error)
    }
}

impl From<reqwest::Error> for Error {
    fn from(error: reqwest::Error) -> Self {
        Self::Network(error)
    }
}

/// The bytes of an unfinished download and their running hash.
///
/// The file is not opened for appending, because Windows refuses to empty such a file.
struct Partial {
    file: File,
    hash: Sha256,
    received: u64,
}

impl Partial {
    fn open(path: &Path) -> io::Result<Self> {
        let mut file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)?;
        let mut hash = Sha256::new();
        let mut received = 0;
        let mut buffer = vec![0; READ_BUFFER];
        loop {
            let read = file.read(&mut buffer)?;
            if read == 0 {
                break;
            }
            hash.update(&buffer[..read]);
            received += read as u64;
        }
        Ok(Self {
            file,
            hash,
            received,
        })
    }

    fn clear(&mut self) -> io::Result<()> {
        self.file.set_len(0)?;
        self.file.rewind()?;
        self.hash = Sha256::new();
        self.received = 0;
        Ok(())
    }

    fn push(&mut self, bytes: &[u8]) -> io::Result<()> {
        self.file.write_all(bytes)?;
        self.hash.update(bytes);
        self.received += bytes.len() as u64;
        Ok(())
    }

    fn digest(self) -> io::Result<String> {
        self.file.sync_all()?;
        Ok(self
            .hash
            .finalize()
            .iter()
            .fold(String::new(), |mut digest, byte| {
                let _ = write!(digest, "{byte:02x}");
                digest
            }))
    }
}

/// Returns the model file in `directory`, downloading it first when it is not there.
///
/// An interrupted download continues from the bytes that already arrived. The file gets its
/// name only after its hash matched, so a file with that name is always the whole model.
///
/// # Errors
///
/// Returns an error when the file cannot be written, the download fails, or the bytes that
/// arrived are not the pinned ones.
pub async fn ensure(
    client: &Client,
    model: &Model,
    directory: &Path,
    mut report: impl FnMut(Progress),
) -> Result<PathBuf, Error> {
    let file = model.file(directory);
    if file.is_file() {
        return Ok(file);
    }
    fs::create_dir_all(directory)?;
    let partial_path = model.partial(directory);
    let mut partial = Partial::open(&partial_path)?;
    if partial.received >= model.size {
        partial.clear()?;
    }
    let mut request = client.get(&model.url);
    if partial.received > 0 {
        request = request.header(RANGE, format!("bytes={}-", partial.received));
    }
    let response = request.send().await?;
    match response.status() {
        StatusCode::PARTIAL_CONTENT => {}
        StatusCode::OK => partial.clear()?,
        status => return Err(Error::Status(status)),
    }
    let mut progress = |received| {
        report(Progress {
            received,
            total: model.size,
        });
    };
    progress(partial.received);
    let mut body = response.bytes_stream();
    while let Some(bytes) = body.next().await {
        partial.push(&bytes?)?;
        progress(partial.received);
    }
    if partial.digest()? != model.sha256 {
        fs::remove_file(&partial_path)?;
        return Err(Error::Checksum);
    }
    fs::rename(&partial_path, &file)?;
    Ok(file)
}

#[cfg(test)]
mod tests {
    use std::io::{BufRead, BufReader};
    use std::net::{Ipv4Addr, TcpListener};
    use std::sync::{Arc, Mutex};
    use std::thread;

    use super::*;

    const BODY: &[u8] = b"the weights of a very small model";
    const BODY_SHA256: &str = "8848f57c7a09430cd55ebd8cf562c1e5109a16efff8585bf56ced24aaa0d6e32";
    const CUT: usize = 10;

    type Ranges = Arc<Mutex<Vec<Option<String>>>>;

    fn respond(stream: std::net::TcpStream, body: &'static [u8], ranges: &Ranges) {
        let mut reader = BufReader::new(stream);
        let mut line = String::new();
        let mut range = None;
        loop {
            line.clear();
            reader.read_line(&mut line).unwrap();
            if line.trim_end().is_empty() {
                break;
            }
            if let Some(value) = line.trim_end().strip_prefix("range: bytes=") {
                range = Some(value.to_owned());
            }
        }
        let start: Option<usize> = range
            .as_deref()
            .and_then(|value| value.trim_end_matches('-').parse().ok());
        ranges.lock().unwrap().push(range);
        let (status, body) = start.map_or(("200 OK", body), |start| {
            ("206 Partial Content", &body[start..])
        });
        let stream = reader.get_mut();
        write!(
            stream,
            "HTTP/1.1 {status}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
            body.len()
        )
        .unwrap();
        stream.write_all(body).unwrap();
    }

    fn serve(body: &'static [u8]) -> (Model, Ranges) {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let ranges = Ranges::default();
        let record = Arc::clone(&ranges);
        thread::spawn(move || {
            for stream in listener.incoming() {
                respond(stream.unwrap(), body, &record);
            }
        });
        let model = Model {
            url: format!("http://127.0.0.1:{port}/model.gguf"),
            sha256: BODY_SHA256.to_owned(),
            size: BODY.len() as u64,
        };
        (model, ranges)
    }

    fn directory(name: &str) -> PathBuf {
        let directory =
            std::env::temp_dir().join(format!("yakusu-model-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        directory
    }

    fn client() -> Client {
        Client::builder().no_proxy().build().unwrap()
    }

    #[tokio::test]
    async fn downloads_the_model_once_and_reports_how_much_arrived() {
        let (model, ranges) = serve(BODY);
        let directory = directory("fresh");
        let mut reports = Vec::new();
        let file = ensure(&client(), &model, &directory, |progress| {
            reports.push(progress);
        })
        .await
        .unwrap();
        assert_eq!(fs::read(&file).unwrap(), BODY);
        assert_eq!(
            reports.last(),
            Some(&Progress {
                received: model.size,
                total: model.size
            })
        );
        let again = ensure(&client(), &model, &directory, |_| {
            unreachable!("downloaded twice")
        })
        .await
        .unwrap();
        assert_eq!(again, file);
        assert_eq!(*ranges.lock().unwrap(), [None]);
    }

    #[tokio::test]
    async fn continues_an_interrupted_download() {
        let (model, ranges) = serve(BODY);
        let directory = directory("resumed");
        fs::create_dir_all(&directory).unwrap();
        fs::write(model.partial(&directory), &BODY[..CUT]).unwrap();
        let mut first = None;
        let file = ensure(&client(), &model, &directory, |progress| {
            first.get_or_insert(progress.received);
        })
        .await
        .unwrap();
        assert_eq!(fs::read(&file).unwrap(), BODY);
        assert_eq!(first, Some(CUT as u64));
        assert_eq!(*ranges.lock().unwrap(), [Some(format!("{CUT}-"))]);
    }

    #[tokio::test]
    async fn refuses_bytes_that_are_not_the_pinned_ones() {
        let (model, _ranges) = serve(b"the weights of another small mode");
        let directory = directory("tampered");
        let result = ensure(&client(), &model, &directory, |_| {}).await;
        assert!(matches!(result, Err(Error::Checksum)), "{result:?}");
        assert!(!model.file(&directory).exists());
        assert!(!model.partial(&directory).exists());
    }
}
