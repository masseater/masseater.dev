use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

use anyhow::{Context, Result, ensure};

use crate::{END, FPS, HEIGHT, START, WIDTH};

pub(crate) const PIXELS: usize = WIDTH * HEIGHT;
const CHANNELS: usize = 3;
const PANES: usize = 3;
const CRF: &str = "20";

pub(crate) struct Clip {
    pub(crate) rgb: Vec<u8>,
    pub(crate) count: usize,
}

impl Clip {
    pub(crate) fn frame(&self, index: usize) -> &[u8] {
        &self.rgb[index * PIXELS * CHANNELS..(index + 1) * PIXELS * CHANNELS]
    }
}

fn ffmpeg() -> Command {
    let mut command = Command::new("ffmpeg");
    command.args(["-v", "error"]);
    command
}

pub(crate) fn decode(source: &Path, arguments: &[&str]) -> Result<Vec<u8>> {
    let output = ffmpeg()
        .args(["-ss", &START.to_string(), "-to", &END.to_string(), "-i"])
        .arg(source)
        .args(arguments)
        .arg("-")
        .stderr(Stdio::inherit())
        .output()
        .context("ffmpeg を起動できない")?;
    ensure!(
        output.status.success(),
        "ffmpeg が {} を読めなかった",
        source.display()
    );
    Ok(output.stdout)
}

pub(crate) fn read_frames(source: &Path) -> Result<Clip> {
    let filter = format!("fps={FPS},scale={WIDTH}:-2,pad={WIDTH}:{HEIGHT}:0:(oh-ih)/2");
    let rgb = decode(
        source,
        &["-vf", &filter, "-f", "rawvideo", "-pix_fmt", "rgb24"],
    )?;
    let count = rgb.len() / (PIXELS * CHANNELS);
    ensure!(
        count > 0,
        "{} から 1 枚も取り出せなかった",
        source.display()
    );
    Ok(Clip { rgb, count })
}

fn gray_to_rgb(row: &[u8]) -> impl Iterator<Item = u8> + '_ {
    row.iter().flat_map(|&value| [value; CHANNELS])
}

fn side_by_side(frame: &[u8], mask: &[u8], background: &[u8]) -> Vec<u8> {
    let mut packed = Vec::with_capacity(PIXELS * CHANNELS * PANES);
    for y in 0..HEIGHT {
        let row = y * WIDTH * CHANNELS..(y + 1) * WIDTH * CHANNELS;
        packed.extend_from_slice(&frame[row.clone()]);
        packed.extend(gray_to_rgb(&mask[y * WIDTH..(y + 1) * WIDTH]));
        packed.extend_from_slice(&background[row]);
    }
    packed
}

pub(crate) fn encode(clip: &Clip, masks: &[u8], background: &[u8], path: &Path) -> Result<()> {
    let size = format!("{}x{HEIGHT}", WIDTH * PANES);
    let mut child = ffmpeg()
        .args(["-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", &size])
        .args(["-r", &FPS.to_string(), "-i", "-", "-c:v", "libx264"])
        .args(["-preset", "slow", "-crf", CRF, "-pix_fmt", "yuv420p"])
        .args(["-movflags", "+faststart", "-an"])
        .arg(path)
        .stdin(Stdio::piped())
        .spawn()
        .context("ffmpeg を起動できない")?;
    let mut input = child.stdin.take().context("ffmpeg の入力が無い")?;
    for index in 0..clip.count {
        let mask = &masks[index * PIXELS..(index + 1) * PIXELS];
        input.write_all(&side_by_side(clip.frame(index), mask, background))?;
    }
    drop(input);
    ensure!(
        child.wait()?.success(),
        "ffmpeg が {} を書けなかった",
        path.display()
    );
    Ok(())
}
