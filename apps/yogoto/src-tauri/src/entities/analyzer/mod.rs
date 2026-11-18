use std::fmt::Write as _;
use std::path::{Path, PathBuf};

use beat_this::{BeatThis, RtenRuntime, Runtime};
use media_notes::{Failure, Outcome};
use rten_tensor::NdTensor;
use rten_tensor::prelude::*;
use sha2::{Digest, Sha256};

pub const SAMPLE_RATE: u32 = 22_050;

pub const BEAT_MODEL: &str = "beat-this 1.1.0 final0";

pub const KEY_MODEL: &str = "s-key musetric/skey-onnx@9d90d2a";

pub const KEYS: [&str; 24] = [
    "A major", "Bb major", "B major", "C major", "C# major", "D major", "Eb major", "E major",
    "F major", "F# major", "G major", "Ab major", "B minor", "C minor", "C# minor", "D minor",
    "Eb minor", "E minor", "F minor", "F# minor", "G minor", "G# minor", "A minor", "Bb minor",
];

struct PinnedFile {
    url: &'static str,
    sha256: &'static str,
}

const MEL: PinnedFile = PinnedFile {
    url: "https://raw.githubusercontent.com/danigb/beat-this-rs/1ae768e78f1ad83b0ed3886241dc29ffde853c40/models/mel_spectrogram.onnx",
    sha256: "fdd59e65c515331308e4c8841edf99972deca646bdf6197744c2a5b7755e3de9",
};

const BEATS: PinnedFile = PinnedFile {
    url: "https://github.com/danigb/beat-this-rs/releases/download/model-large/beat_this.onnx",
    sha256: "5f810debe53459b559127fb55bbad40035bb47cc567b20e501670f968c770f02",
};

const KEY: PinnedFile = PinnedFile {
    url: "https://huggingface.co/musetric/skey-onnx/resolve/9d90d2a9ff6679df1d64000f4fa750643f247643/skey.onnx",
    sha256: "5113c1378c1007c8559fcb767593366ba9794397b060535eb80a113db50530fc",
};

type BeatModel = <RtenRuntime as Runtime>::Model;

pub struct Analyzer {
    beats: BeatThis<BeatModel>,
    key: rten::Model,
}

pub struct Beats {
    pub beats: Vec<f32>,
    pub downbeats: Vec<f32>,
}

fn failure(error: &dyn std::fmt::Display) -> Failure {
    Failure::new(error.to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    })
}

async fn fetch(client: &reqwest::Client, directory: &Path, file: &PinnedFile) -> Outcome<PathBuf> {
    let path = directory.join(format!("{}.onnx", file.sha256));
    if tokio::fs::try_exists(&path).await? {
        return Ok(path);
    }
    let body = client
        .get(file.url)
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|error| failure(&error))?
        .bytes()
        .await
        .map_err(|error| failure(&error))?;
    let digest = hex(&Sha256::digest(&body));
    if digest != file.sha256 {
        return Err(Failure::new(format!(
            "{} does not match its pinned sha256",
            file.url
        )));
    }
    tokio::fs::create_dir_all(directory).await?;
    let partial = path.with_extension("part");
    tokio::fs::write(&partial, &body).await?;
    tokio::fs::rename(&partial, &path).await?;
    Ok(path)
}

impl Analyzer {
    pub async fn load(client: &reqwest::Client, cache: &Path) -> Outcome<Self> {
        let directory = cache.join("models");
        let mel = fetch(client, &directory, &MEL).await?;
        let beats = fetch(client, &directory, &BEATS).await?;
        let key = fetch(client, &directory, &KEY).await?;
        Ok(Self {
            beats: BeatThis::new(&RtenRuntime, &mel, &beats).map_err(|error| failure(&error))?,
            key: rten::Model::load_file(key).map_err(|error| failure(&error))?,
        })
    }

    pub fn beats(&mut self, mono: &[f32]) -> Outcome<Beats> {
        let analysis = self
            .beats
            .analyze_audio(mono, SAMPLE_RATE)
            .map_err(|error| failure(&error))?;
        Ok(Beats {
            beats: analysis.beats,
            downbeats: analysis.downbeats,
        })
    }

    pub fn key(&self, mono: &[f32]) -> Outcome<usize> {
        let peak = mono
            .iter()
            .fold(0.0_f32, |peak, sample| peak.max(sample.abs()));
        let scale = if peak > 0.0 { peak.recip() } else { 1.0 };
        let input = NdTensor::from_data(
            [1, mono.len()],
            mono.iter().map(|sample| sample * scale).collect::<Vec<_>>(),
        );
        let output = self
            .key
            .run_one(input.view().into(), None)
            .map_err(|error| failure(&error))?;
        let probabilities: NdTensor<f32, 1> = output.try_into().map_err(|error| failure(&error))?;
        probabilities
            .iter()
            .enumerate()
            .max_by(|left, right| left.1.total_cmp(right.1))
            .map(|(index, _)| index)
            .ok_or_else(|| Failure::new("key model returned nothing"))
    }
}
