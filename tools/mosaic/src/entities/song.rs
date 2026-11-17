use std::fs;
use std::path::Path;

use anyhow::{Result, bail};
use serde::Deserialize;

pub(crate) const PROGRESS: &str = "progress.json";

pub(crate) const SONGS: &str = "songs.json";

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
