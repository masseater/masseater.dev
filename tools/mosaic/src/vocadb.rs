use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;
use std::thread::sleep;
use std::time::Duration;

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::net::get_with;

const PAGE: usize = 100;
const INTERVAL: Duration = Duration::from_secs(1);
const TRIES: u32 = 3;
const TIMEOUT: Duration = Duration::from_secs(60);
const CHECKPOINT: usize = 20;
const PROGRESS: &str = "progress.json";
const SONGS: &str = "songs.json";
const API: &str = "https://vocadb.net/api/songs";
const BY_ADDITION: &str = "AdditionDate";
const BY_RATING: &str = "RatingScore";
pub(crate) const YOUTUBE: &str = "Youtube";
pub(crate) const NICONICO: &str = "NicoNicoDouga";
pub(crate) const YOUTUBE_SIZES: [&str; 4] =
    ["maxresdefault", "sddefault", "hqdefault", "mqdefault"];

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Pv {
    pub(crate) service: String,
    #[serde(rename = "pvType")]
    pub(crate) kind: String,
    #[serde(rename = "pvId")]
    pub(crate) id: String,
    pub(crate) url: String,
    #[serde(default)]
    pub(crate) disabled: bool,
    pub(crate) thumb_url: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Song {
    pub(crate) id: u64,
    pub(crate) name: String,
    pub(crate) artist_string: Option<String>,
    #[serde(default)]
    pub(crate) rating_score: i64,
    #[serde(default)]
    pub(crate) pvs: Vec<Pv>,
}

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

pub(crate) fn load_songs(cache: &Path) -> Result<Vec<Song>> {
    let progress = cache.join(PROGRESS);
    if progress.exists() {
        bail!("VocaDB の一覧を取り終えていない: {}", progress.display());
    }
    let mut found: Vec<Song> = serde_json::from_slice(&fs::read(cache.join(SONGS))?)?;
    found.sort_by_key(|song| (-song.rating_score, song.id));
    Ok(found)
}

fn original_pv<'song>(song: &'song Song, service: &str) -> Option<&'song Pv> {
    song.pvs
        .iter()
        .find(|pv| pv.service == service && pv.kind == "Original" && !pv.disabled)
}

fn secure(url: &str) -> String {
    url.replace("http://", "https://")
}

pub(crate) fn youtube_thumbnails(video: &str, sizes: &[&str]) -> Vec<String> {
    sizes
        .iter()
        .map(|size| format!("https://i.ytimg.com/vi/{video}/{size}.jpg"))
        .collect()
}

pub(crate) fn thumbnail_candidates<'song>(
    song: &'song Song,
    sizes: &[&str],
) -> Option<(&'song Pv, Vec<String>)> {
    if let Some(youtube) = original_pv(song, YOUTUBE) {
        return Some((youtube, youtube_thumbnails(&youtube.id, sizes)));
    }
    let niconico = original_pv(song, NICONICO)?;
    let thumbnail = niconico.thumb_url.as_ref()?;
    Some((niconico, vec![secure(thumbnail)]))
}

pub(crate) fn secure_url(pv: &Pv) -> String {
    secure(&pv.url)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn song(pvs: &str) -> Song {
        serde_json::from_str(&format!(r#"{{"id":1,"name":"曲","pvs":{pvs}}}"#)).unwrap()
    }

    #[test]
    fn prefers_the_original_youtube_video_over_niconico() {
        let found = song(
            r#"[{"service":"NicoNicoDouga","pvType":"Original","pvId":"sm9","url":"http://nico/sm9","thumbUrl":"http://nico/9.jpg"},
                {"service":"Youtube","pvType":"Reprint","pvId":"no","url":"https://y/no"},
                {"service":"Youtube","pvType":"Original","pvId":"abc","url":"https://y/abc"}]"#,
        );
        let (pv, urls) = thumbnail_candidates(&found, &["mqdefault"]).unwrap();
        assert_eq!(pv.id, "abc");
        assert_eq!(urls, ["https://i.ytimg.com/vi/abc/mqdefault.jpg"]);
    }

    #[test]
    fn falls_back_to_the_niconico_thumbnail_over_https() {
        let found = song(
            r#"[{"service":"Youtube","pvType":"Original","pvId":"gone","url":"https://y/gone","disabled":true},
                {"service":"NicoNicoDouga","pvType":"Original","pvId":"sm9","url":"http://nico/sm9","thumbUrl":"http://nico/9.jpg"}]"#,
        );
        let (pv, urls) = thumbnail_candidates(&found, &YOUTUBE_SIZES).unwrap();
        assert_eq!(secure_url(pv), "https://nico/sm9");
        assert_eq!(urls, ["https://nico/9.jpg"]);
    }

    #[test]
    fn has_no_candidate_without_an_original_video() {
        let found =
            song(r#"[{"service":"Youtube","pvType":"Reprint","pvId":"x","url":"https://y/x"}]"#);
        assert!(thumbnail_candidates(&found, &YOUTUBE_SIZES).is_none());
    }
}
