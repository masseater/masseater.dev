use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use anyhow::{Context, Result};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

use crate::image::{
    FEATURES, Filter, crop_to_tile, decode_rgb, dhash, encode_jpeg, features, resize_rgb,
};
use crate::net::get_with;
use crate::vocadb::{Song, YOUTUBE, YOUTUBE_SIZES, load_songs, secure_url, thumbnail_candidates};

const SMALL: (u32, u32) = (160, 90);
const SMALL_QUALITY: u8 = 90;
pub(crate) const SMALL_DIR: &str = "small";
pub(crate) const POOL_FILE: &str = "pool.json";
pub(crate) const FEATURES_FILE: &str = "features.json";
const THUMBS_FILE: &str = "thumbs.json";
const MIN_WIDTH: u32 = 320;
const THUMB_TRIES: u32 = 2;
const THUMB_TIMEOUT: Duration = Duration::from_secs(30);
pub(crate) const DOWNLOADS: usize = 16;

pub(crate) type Features = [f32; FEATURES];

#[derive(Serialize, Deserialize, Clone)]
struct Thumb {
    hash: [u8; 8],
    features: Vec<f32>,
}

#[derive(Serialize, Deserialize, Default)]
struct Thumbs {
    known: BTreeMap<u64, Thumb>,
    missing: BTreeSet<u64>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Entry {
    pub(crate) song: u64,
    pub(crate) name: String,
    pub(crate) artist: String,
    pub(crate) service: String,
    pub(crate) pv_id: String,
    pub(crate) url: String,
    pub(crate) thumbs: Vec<String>,
}

pub(crate) fn small_path(cache: &Path, song: u64) -> std::path::PathBuf {
    cache.join(SMALL_DIR).join(format!("{song}.jpg"))
}

fn download(song: &Song, cache: &Path, missing: &Mutex<BTreeSet<u64>>) -> Result<Option<Entry>> {
    let (Some((pv, urls)), Some((_, full))) = (
        thumbnail_candidates(song, &["mqdefault"]),
        thumbnail_candidates(song, &YOUTUBE_SIZES),
    ) else {
        return Ok(None);
    };
    let give_up = || {
        missing
            .lock()
            .map(|mut ids| ids.insert(song.id))
            .map_err(|_| anyhow::anyhow!("取れなかった曲の一覧を更新できなかった"))
    };
    if missing.lock().is_ok_and(|ids| ids.contains(&song.id)) {
        return Ok(None);
    }
    let path = small_path(cache, song.id);
    if !path.exists() {
        let Some(raw) = urls
            .first()
            .and_then(|url| get_with(url, THUMB_TRIES, THUMB_TIMEOUT))
        else {
            give_up()?;
            return Ok(None);
        };
        let image =
            decode_rgb(&raw).with_context(|| format!("サムネイルを開けなかった: {}", song.id))?;
        if image.width() < MIN_WIDTH && pv.service == YOUTUBE {
            give_up()?;
            return Ok(None);
        }
        let small = resize_rgb(&crop_to_tile(&image), SMALL, Filter::Lanczos)?;
        fs::write(&path, encode_jpeg(&small, SMALL_QUALITY, false)?)?;
    }
    Ok(Some(Entry {
        song: song.id,
        name: song.name.clone(),
        artist: song.artist_string.clone().unwrap_or_default(),
        service: pv.service.clone(),
        pv_id: pv.id.clone(),
        url: secure_url(pv),
        thumbs: full,
    }))
}

fn measure(cache: &Path, song: u64) -> Result<Thumb> {
    let image = decode_rgb(&fs::read(small_path(cache, song))?)?;
    Ok(Thumb {
        hash: dhash(&image)?,
        features: features(&image)?.to_vec(),
    })
}

pub(crate) fn build_pool(cache: &Path) -> Result<()> {
    fs::create_dir_all(cache.join(SMALL_DIR))?;
    let thumbs_path = cache.join(THUMBS_FILE);
    let thumbs: Thumbs = if thumbs_path.exists() {
        serde_json::from_slice(&fs::read(&thumbs_path)?)?
    } else {
        Thumbs::default()
    };
    let songs = load_songs(&cache.join("vocadb"))?;
    let missing = Mutex::new(thumbs.missing);
    let downloads = rayon::ThreadPoolBuilder::new()
        .num_threads(DOWNLOADS)
        .build()?;
    let entries: Vec<Entry> = downloads
        .install(|| {
            songs
                .par_iter()
                .map(|song| download(song, cache, &missing))
                .collect::<Result<Vec<_>>>()
        })?
        .into_iter()
        .flatten()
        .collect();
    let mut known = thumbs.known;
    let measured: Vec<(u64, Thumb)> = entries
        .par_iter()
        .filter(|entry| !known.contains_key(&entry.song))
        .map(|entry| Ok((entry.song, measure(cache, entry.song)?)))
        .collect::<Result<_>>()?;
    known.extend(measured);
    let mut seen = HashSet::new();
    let mut kept = Vec::new();
    let mut pool = Vec::new();
    for entry in &entries {
        let thumb = known
            .get(&entry.song)
            .context("特徴を測っていない曲がある")?;
        if seen.insert(thumb.hash) {
            kept.push(entry);
            pool.push(&thumb.features);
        }
    }
    let missing = missing
        .into_inner()
        .map_err(|_| anyhow::anyhow!("取れなかった曲の一覧を読めなかった"))?;
    fs::write(cache.join(FEATURES_FILE), serde_json::to_vec(&pool)?)?;
    fs::write(cache.join(POOL_FILE), serde_json::to_vec(&kept)?)?;
    eprintln!(
        "pool songs={} downloaded={} unique={}",
        songs.len(),
        entries.len(),
        kept.len()
    );
    fs::write(thumbs_path, serde_json::to_vec(&Thumbs { known, missing })?)?;
    Ok(())
}

pub(crate) fn load_pool(cache: &Path) -> Result<(Vec<Entry>, Vec<Features>)> {
    let entries = serde_json::from_slice(&fs::read(cache.join(POOL_FILE))?)?;
    let listed: Vec<Vec<f32>> = serde_json::from_slice(&fs::read(cache.join(FEATURES_FILE))?)?;
    let pool = listed
        .into_iter()
        .map(|values| {
            Features::try_from(values).map_err(|_| anyhow::anyhow!("特徴の長さが合わない"))
        })
        .collect::<Result<_>>()?;
    Ok((entries, pool))
}
