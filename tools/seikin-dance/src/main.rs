mod audio;
mod beat;
mod inpaint;
mod landmark;
mod plate;
mod sheet;
mod video;

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, ensure};
use serde_json::json;

const START: f64 = 0.0;
const END: f64 = 28.8;
const FPS: usize = 30;
const WIDTH: usize = 640;
const HEIGHT: usize = 360;

const PUBLIC: &str = "apps/portfolio/public/seikin-techniques";
const TRACK: &str = "apps/portfolio/src/features/dance-stage/model/generated/track.json";

fn source(cache: &Path) -> Result<PathBuf> {
    let path = std::env::args()
        .nth(1)
        .map_or_else(|| cache.join("source.mp4"), PathBuf::from);
    ensure!(
        path.exists(),
        "元の動画が無い。ファイルを引数で渡すか {} に置く",
        path.display()
    );
    Ok(path)
}

fn main() -> Result<()> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let workspace = root.ancestors().nth(2).context("ワークスペースが無い")?;
    let cache = root.join(".cache");
    fs::create_dir_all(&cache)?;
    let source = source(&cache)?;
    let public = workspace.join(PUBLIC);
    fs::create_dir_all(&public)?;

    let clip = video::read_frames(&source)?;
    let poses = landmark::cached(root, &source, &clip)?;
    let background = plate::plate(&clip, &poses.masks);
    video::encode(&clip, &poses.masks, &background, &public.join("dance.mp4"))?;
    fs::write(
        public.join("history.jpg"),
        sheet::history(&clip, &poses.masks)?,
    )?;
    let sound = audio::analyze(&source, clip.count)?;
    let track = json!({
        "fps": FPS,
        "width": WIDTH,
        "height": HEIGHT,
        "frames": poses.marks,
        "audio": sound.levels,
        "beats": sound.beats,
    });
    fs::write(workspace.join(TRACK), serde_json::to_string(&track)?)?;
    Ok(())
}
