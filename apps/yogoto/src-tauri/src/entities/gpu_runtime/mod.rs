use std::fmt::Write as _;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, PoisonError};
use std::time::Duration;

use media_notes::{Failure, Outcome};
use serde::Deserialize;
use sha2::{Digest, Sha256};

const CHUNK: u64 = 8 << 20;
const REPORT_EVERY: Duration = Duration::from_millis(500);

#[derive(Deserialize)]
struct Pinned {
    name: String,
    archive: String,
    sha256: String,
    size: u64,
}

#[derive(Deserialize)]
struct Manifest {
    files: Vec<Pinned>,
}

fn failure(error: &dyn std::fmt::Display) -> Failure {
    Failure::new(error.to_string())
}

fn kib(bytes: u64) -> f64 {
    f64::from(u32::try_from(bytes >> 10).unwrap_or(u32::MAX))
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    })
}

struct Remote {
    client: reqwest::Client,
    url: String,
    length: u64,
    position: u64,
    start: u64,
    buffer: Vec<u8>,
}

impl Remote {
    fn open(client: &reqwest::Client, url: &str) -> Outcome<Self> {
        let length = tauri::async_runtime::block_on(async {
            client
                .head(url)
                .send()
                .await
                .and_then(reqwest::Response::error_for_status)
                .map(|response| response.content_length())
        })
        .map_err(|error| failure(&error))?
        .ok_or_else(|| Failure::new(format!("{url} has no length")))?;
        Ok(Self {
            client: client.clone(),
            url: url.to_owned(),
            length,
            position: 0,
            start: 0,
            buffer: Vec::new(),
        })
    }

    fn fill(&mut self) -> std::io::Result<()> {
        let end = (self.position + CHUNK).min(self.length) - 1;
        let range = format!("bytes={}-{end}", self.position);
        let bytes = tauri::async_runtime::block_on(async {
            self.client
                .get(&self.url)
                .header(reqwest::header::RANGE, range)
                .send()
                .await
                .and_then(reqwest::Response::error_for_status)?
                .bytes()
                .await
        })
        .map_err(std::io::Error::other)?;
        self.start = self.position;
        self.buffer = bytes.to_vec();
        Ok(())
    }
}

impl Read for Remote {
    fn read(&mut self, into: &mut [u8]) -> std::io::Result<usize> {
        if self.position >= self.length {
            return Ok(0);
        }
        let end = self.start + self.buffer.len() as u64;
        if self.position < self.start || self.position >= end {
            self.fill()?;
        }
        let offset = usize::try_from(self.position - self.start).map_err(std::io::Error::other)?;
        let available = &self.buffer[offset..];
        let count = available.len().min(into.len());
        into[..count].copy_from_slice(&available[..count]);
        self.position += count as u64;
        Ok(count)
    }
}

impl Seek for Remote {
    fn seek(&mut self, to: SeekFrom) -> std::io::Result<u64> {
        let target = match to {
            SeekFrom::Start(offset) => Some(offset),
            SeekFrom::End(offset) => self.length.checked_add_signed(offset),
            SeekFrom::Current(offset) => self.position.checked_add_signed(offset),
        };
        self.position =
            target.ok_or_else(|| std::io::Error::other("seek before the start of the archive"))?;
        Ok(self.position)
    }
}

struct Hashing<'a> {
    file: std::fs::File,
    hasher: Sha256,
    written: u64,
    report: &'a dyn Fn(u64),
}

impl Write for Hashing<'_> {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        let count = self.file.write(bytes)?;
        self.hasher.update(&bytes[..count]);
        self.written += count as u64;
        (self.report)(self.written);
        Ok(count)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.file.flush()
    }
}

fn present(directory: &Path, file: &Pinned) -> bool {
    std::fs::metadata(directory.join(&file.name)).is_ok_and(|meta| meta.len() == file.size)
}

fn fetch(
    client: &reqwest::Client,
    directory: &Path,
    file: &Pinned,
    report: &dyn Fn(u64),
) -> Outcome<()> {
    let mut archive = zip::ZipArchive::new(Remote::open(client, &file.archive)?)
        .map_err(|error| failure(&error))?;
    let suffix = format!("/{}", file.name);
    let index = (0..archive.len())
        .find(|&index| {
            archive
                .name_for_index(index)
                .is_some_and(|name| name.is_ok_and(|name| name.ends_with(&suffix)))
        })
        .ok_or_else(|| Failure::new(format!("{} is not in {}", file.name, file.archive)))?;
    let mut entry = archive.by_index(index).map_err(|error| failure(&error))?;
    let partial = directory.join(format!("{}.part", file.name));
    let mut sink = Hashing {
        file: std::fs::File::create(&partial)?,
        hasher: Sha256::new(),
        written: 0,
        report,
    };
    std::io::copy(&mut entry, &mut sink)?;
    sink.flush()?;
    let digest = hex(&sink.hasher.finalize());
    drop(sink.file);
    if digest != file.sha256 {
        std::fs::remove_file(&partial)?;
        return Err(Failure::new(format!(
            "{} from {} does not match its pinned sha256",
            file.name, file.archive
        )));
    }
    std::fs::rename(&partial, directory.join(&file.name))?;
    Ok(())
}

fn install(
    client: &reqwest::Client,
    manifest: &Path,
    directory: &Path,
    report: &dyn Fn(f64),
) -> Outcome<()> {
    let manifest: Manifest =
        serde_json::from_str(&std::fs::read_to_string(manifest)?).map_err(|error| failure(&error))?;
    let missing: Vec<&Pinned> = manifest
        .files
        .iter()
        .filter(|file| !present(directory, file))
        .collect();
    let total: u64 = missing.iter().map(|file| file.size).sum();
    let mut done = 0;
    for file in missing {
        tracing::info!(name = file.name, archive = file.archive, "fetching gpu runtime");
        let progress = |written: u64| report(kib(done + written) / kib(total).max(1.0));
        fetch(client, directory, file, &progress)?;
        done += file.size;
    }
    Ok(())
}

#[derive(Default)]
struct State {
    progress: f64,
    outcome: Option<Result<(), String>>,
}

#[derive(Clone)]
pub struct GpuRuntime {
    state: Arc<(Mutex<State>, Condvar)>,
}

impl GpuRuntime {
    #[must_use]
    pub fn prepare(client: reqwest::Client, manifest: Option<PathBuf>) -> Self {
        let runtime = Self {
            state: Arc::new((Mutex::new(State::default()), Condvar::new())),
        };
        let shared = runtime.clone();
        std::thread::spawn(move || {
            let outcome = match (manifest, std::env::current_exe()) {
                (Some(manifest), Ok(exe)) => exe.parent().map_or_else(
                    || Err(Failure::new("the app has no folder")),
                    |directory| {
                        install(&client, &manifest, directory, &|ratio| shared.report(ratio))
                    },
                ),
                (None, _) => Ok(()),
                (_, Err(error)) => Err(error.into()),
            };
            if let Err(failure) = &outcome {
                tracing::error!(message = failure.message, "gpu runtime could not be prepared");
            }
            shared.finish(outcome.map_err(|failure| failure.message));
        });
        runtime
    }

    fn report(&self, ratio: f64) {
        let (state, _) = &*self.state;
        state.lock().unwrap_or_else(PoisonError::into_inner).progress = ratio;
    }

    fn finish(&self, outcome: Result<(), String>) {
        let (state, ready) = &*self.state;
        state.lock().unwrap_or_else(PoisonError::into_inner).outcome = Some(outcome);
        ready.notify_all();
    }

    pub fn wait(&self, report: &dyn Fn(f64)) -> Outcome<()> {
        let (state, ready) = &*self.state;
        let mut current = state.lock().unwrap_or_else(PoisonError::into_inner);
        loop {
            if let Some(outcome) = &current.outcome {
                return outcome.clone().map_err(Failure::new);
            }
            report(current.progress);
            current = ready
                .wait_timeout(current, REPORT_EVERY)
                .unwrap_or_else(PoisonError::into_inner)
                .0;
        }
    }
}
