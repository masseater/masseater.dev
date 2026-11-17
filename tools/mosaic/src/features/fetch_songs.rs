use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::thread::sleep;
use std::time::Duration;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::shared::net::get_with;

use crate::entities::song::{NICONICO, PROGRESS, SONGS, YOUTUBE};

const PAGE: usize = 100;
const INTERVAL: Duration = Duration::from_secs(1);
const TRIES: u32 = 3;
const TIMEOUT: Duration = Duration::from_secs(60);
const CHECKPOINT: usize = 20;

const API: &str = "https://vocadb.net/api/songs";
const BY_ADDITION: &str = "AdditionDate";
const BY_RATING: &str = "RatingScore";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SongPage {
    items: Vec<Value>,
    #[serde(default)]
    total_count: usize,
}

#[derive(Serialize, Deserialize)]
struct Progress {
    start: usize,
}

type Known = BTreeMap<u64, Value>;

fn id_of(song: &Value) -> Result<u64> {
    song.get("id")
        .and_then(Value::as_u64)
        .context("VocaDB の曲に id が無い")
}

fn keyed(songs: Vec<Value>) -> Result<Known> {
    songs
        .into_iter()
        .map(|song| Ok((id_of(&song)?, song)))
        .collect()
}

fn page(artist: u64, start: usize, sort: &str, count: bool) -> Result<SongPage> {
    let url = format!(
        "{API}?artistId%5B%5D={artist}&childVoicebanks=true&maxResults={PAGE}&start={start}&fields=PVs&sort={sort}&pvServices={NICONICO},{YOUTUBE}&getTotalCount={count}"
    );
    sleep(INTERVAL);
    let raw = get_with(&url, TRIES, TIMEOUT)
        .with_context(|| format!("VocaDB の一覧を取れなかった: {url}"))?;
    eprintln!("vocadb {sort} {start}");
    Ok(serde_json::from_slice(&raw)?)
}

fn top_rated(artist: u64, limit: usize) -> Result<Known> {
    let first = page(artist, 0, BY_RATING, true)?;
    let count = limit.min(first.total_count);
    let mut songs = first.items;
    for start in (PAGE..count).step_by(PAGE) {
        songs.extend(page(artist, start, BY_RATING, false)?.items);
    }
    keyed(songs)
}

fn write(path: &Path, data: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let draft = path.with_extension("tmp");
    fs::write(&draft, data)?;
    fs::rename(draft, path)?;
    Ok(())
}

fn write_songs(cache: &Path, songs: &Known) -> Result<()> {
    let listed: Vec<&Value> = songs.values().collect();
    write(&cache.join(SONGS), &serde_json::to_vec(&listed)?)
}

fn resume(artist: u64, cache: &Path, known: Known) -> Result<Known> {
    let progress = cache.join(PROGRESS);
    let mut start = if progress.exists() {
        serde_json::from_slice::<Progress>(&fs::read(&progress)?)?.start
    } else {
        0
    };
    let mut merged = known;
    let first = page(artist, start, BY_ADDITION, true)?;
    let count = first.total_count;
    let mut items = first.items;
    let mut pages = 0;
    loop {
        merged.extend(keyed(items)?);
        start += PAGE;
        pages += 1;
        if start >= count {
            break;
        }
        if pages % CHECKPOINT == 0 {
            write_songs(cache, &merged)?;
            write(&progress, &serde_json::to_vec(&Progress { start })?)?;
        }
        items = page(artist, start, BY_ADDITION, false)?.items;
    }
    if progress.exists() {
        fs::remove_file(progress)?;
    }
    Ok(merged)
}

fn added_since(artist: u64, known: &Known) -> Result<Known> {
    let mut found = Known::new();
    let mut start = 0;
    loop {
        let items = page(artist, start, BY_ADDITION, false)?.items;
        let full = items.len() >= PAGE;
        let ids: BTreeSet<u64> = items.iter().map(id_of).collect::<Result<_>>()?;
        found.extend(keyed(items)?);
        if !full || ids.iter().all(|id| known.contains_key(id)) {
            return Ok(found);
        }
        start += PAGE;
    }
}

fn fresh(artist: u64, known: &Known) -> Known {
    added_since(artist, known).unwrap_or_else(|error| {
        eprintln!("vocadb 差分を取れず前回の一覧のまま使う: {error:#}");
        Known::new()
    })
}

pub(crate) fn fetch_songs(artist: u64, cache: &Path, limit: Option<usize>) -> Result<()> {
    let path = cache.join(SONGS);
    let (before, merged) = if let Some(limit) = limit {
        (0, top_rated(artist, limit)?)
    } else {
        let known = if path.exists() {
            keyed(serde_json::from_slice(&fs::read(&path)?)?)?
        } else {
            Known::new()
        };
        let before = known.len();
        if known.is_empty() || cache.join(PROGRESS).exists() {
            (before, resume(artist, cache, known)?)
        } else {
            let added = fresh(artist, &known);
            let mut merged = known;
            merged.extend(added);
            (before, merged)
        }
    };
    write_songs(cache, &merged)?;
    eprintln!("vocadb known={before} now={}", merged.len());
    Ok(())
}
