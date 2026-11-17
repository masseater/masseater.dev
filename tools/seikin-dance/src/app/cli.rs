use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, ensure};
use serde_json::json;

use crate::entities::clip;
use crate::features::{analyze_audio, draw_history, paint_plate, track_poses};
use crate::shared::config::{FPS, HEIGHT, WIDTH};

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

pub fn run() -> Result<()> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let workspace = root.ancestors().nth(2).context("ワークスペースが無い")?;
    let cache = root.join(".cache");
    fs::create_dir_all(&cache)?;
    let source = source(&cache)?;
    let public = workspace.join(PUBLIC);
    fs::create_dir_all(&public)?;

    let clip = clip::read_frames(&source)?;
    let poses = track_poses::cached(root, &source, &clip)?;
    let background = paint_plate::plate(&clip, &poses.masks);
    clip::encode(&clip, &poses.masks, &background, &public.join("dance.mp4"))?;
    fs::write(
        public.join("history.jpg"),
        draw_history::history(&clip, &poses.masks)?,
    )?;
    let sound = analyze_audio::analyze(&source, clip.count)?;
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
