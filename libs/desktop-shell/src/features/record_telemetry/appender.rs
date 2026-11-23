use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex, PoisonError};

const LIMIT: u64 = 64 * 1024 * 1024;
const NEWLINE: u8 = b'\n';

#[derive(Debug)]
pub struct Appender {
    file: Arc<Mutex<File>>,
    pending: Vec<u8>,
}

impl Clone for Appender {
    fn clone(&self) -> Self {
        Self {
            file: Arc::clone(&self.file),
            pending: Vec::new(),
        }
    }
}

impl Appender {
    pub fn open(dir: &Path, signal: &str) -> io::Result<Self> {
        fs::create_dir_all(dir)?;
        let current = dir.join(format!("{signal}.jsonl"));
        if fs::metadata(&current).is_ok_and(|meta| meta.len() > LIMIT) {
            fs::rename(&current, dir.join(format!("{signal}.1.jsonl")))?;
        }
        let file = OpenOptions::new().create(true).append(true).open(current)?;
        Ok(Self {
            file: Arc::new(Mutex::new(file)),
            pending: Vec::new(),
        })
    }

    fn append(&self, lines: &[u8]) -> io::Result<()> {
        self.file
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .write_all(lines)
    }

    pub fn line(&self, json: &serde_json::Value) -> io::Result<()> {
        let mut bytes = serde_json::to_vec(json)?;
        bytes.push(NEWLINE);
        let mut file = self.file.lock().unwrap_or_else(PoisonError::into_inner);
        if file.metadata()?.len() > LIMIT {
            return Err(io::ErrorKind::FileTooLarge.into());
        }
        file.write_all(&bytes)
    }
}

impl Write for Appender {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.pending.extend_from_slice(bytes);
        if let Some(end) = self.pending.iter().rposition(|byte| *byte == NEWLINE) {
            let complete: Vec<u8> = self.pending.drain(..=end).collect();
            self.append(&complete)?;
        }
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        self.file
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .flush()
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::io::Write;

    use super::{Appender, LIMIT};

    #[test]
    fn keeps_lines_whole_when_two_writers_share_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let mut spans = Appender::open(dir.path(), "traces").unwrap();
        let screen = spans.clone();
        spans.write_all(b"{\"resourceSpans\":").unwrap();
        screen
            .line(&serde_json::json!({ "resourceSpans": [] }))
            .unwrap();
        spans.write_all(b"[]}\n").unwrap();
        let written = fs::read_to_string(dir.path().join("traces.jsonl")).unwrap();
        assert_eq!(written, "{\"resourceSpans\":[]}\n{\"resourceSpans\":[]}\n");
    }

    #[test]
    fn refuses_screen_lines_once_the_file_has_passed_the_limit() {
        let dir = tempfile::tempdir().unwrap();
        let screen = Appender::open(dir.path(), "logs").unwrap();
        let file = dir.path().join("logs.jsonl");
        let batch = serde_json::json!({ "resourceLogs": [] });
        screen.line(&batch).unwrap();
        fs::OpenOptions::new()
            .write(true)
            .open(&file)
            .unwrap()
            .set_len(LIMIT + 1)
            .unwrap();
        assert!(screen.line(&batch).is_err());
        assert_eq!(fs::metadata(&file).unwrap().len(), LIMIT + 1);
    }
}
