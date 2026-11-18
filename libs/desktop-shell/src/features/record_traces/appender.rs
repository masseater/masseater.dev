use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex, PoisonError};

const TRACES: &str = "traces.jsonl";
const PREVIOUS: &str = "traces.1.jsonl";
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
    pub fn open(dir: &Path) -> io::Result<Self> {
        fs::create_dir_all(dir)?;
        let traces = dir.join(TRACES);
        if fs::metadata(&traces).is_ok_and(|meta| meta.len() > LIMIT) {
            fs::rename(&traces, dir.join(PREVIOUS))?;
        }
        let file = OpenOptions::new().create(true).append(true).open(traces)?;
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
        self.append(&bytes)
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

    use super::{Appender, TRACES};

    #[test]
    fn keeps_lines_whole_when_two_writers_share_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let mut spans = Appender::open(dir.path()).unwrap();
        let screen = spans.clone();
        spans.write_all(b"{\"resourceSpans\":").unwrap();
        screen
            .line(&serde_json::json!({ "resourceSpans": [] }))
            .unwrap();
        spans.write_all(b"[]}\n").unwrap();
        let written = fs::read_to_string(dir.path().join(TRACES)).unwrap();
        assert_eq!(written, "{\"resourceSpans\":[]}\n{\"resourceSpans\":[]}\n");
    }
}
