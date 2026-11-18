use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use super::{Found, Stream, text_at};
use crate::shared::error::{Fetching, site_failure};
use crate::shared::http::text;

const API: &str = "https://api-v2.soundcloud.com";
const CLIENT_ID_FILE: &str = "soundcloud-client-id";

static TRACK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^https?://(?:www\.|m\.)?soundcloud\.com/[^/?#]+/[^/?#]+").expect("valid pattern")
});
static SCRIPT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"<script[^>]+src="([^"]+)""#).expect("valid pattern"));
static CLIENT_ID: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"client_id\s*:\s*"([0-9a-zA-Z]{32})""#).expect("valid pattern"));

#[must_use]
pub fn track_url(url: &str) -> Option<String> {
    Some(TRACK.find(url)?.as_str().to_owned())
}

fn rank(transcoding: &Value) -> u8 {
    let preset = transcoding["preset"].as_str().unwrap_or_default();
    let protocol = transcoding["format"]["protocol"]
        .as_str()
        .unwrap_or_default();
    let encrypted =
        protocol.starts_with("ctr-") || protocol.starts_with("cbc-") || protocol == "encrypted-hls";
    if encrypted || preset.starts_with("abr") {
        return 0;
    }
    match (preset.split('_').next().unwrap_or_default(), protocol) {
        ("aac", "hls") => 4,
        ("opus", "hls") => 3,
        ("mp3", "progressive") => 2,
        ("mp3", "hls") => 1,
        _ => 0,
    }
}

fn kilobits(transcoding: &Value) -> u32 {
    transcoding["preset"]
        .as_str()
        .and_then(|preset| preset.split('_').nth(1))
        .and_then(|rate| rate.trim_end_matches('k').parse().ok())
        .unwrap_or(0)
}

pub struct Choice {
    pub url: String,
    pub progressive: bool,
    pub extension: &'static str,
}

pub fn choose(track: &Value) -> Fetching<Choice> {
    let best = track["media"]["transcodings"]
        .as_array()
        .ok_or_else(|| site_failure("soundcloud: no transcodings"))?
        .iter()
        .filter(|transcoding| rank(transcoding) > 0)
        .max_by_key(|transcoding| (rank(transcoding), kilobits(transcoding)))
        .ok_or_else(|| site_failure("soundcloud: no usable transcoding"))?;
    let extension = match rank(best) {
        4 => "m4a",
        3 => "opus",
        _ => "mp3",
    };
    Ok(Choice {
        url: text_at(best, "/url"),
        progressive: best["format"]["protocol"] == "progressive",
        extension,
    })
}

#[must_use]
pub fn client_id_in(script: &str) -> Option<String> {
    Some(CLIENT_ID.captures(script)?.get(1)?.as_str().to_owned())
}

#[tracing::instrument(skip(client, cache))]
async fn scrape_client_id(client: &reqwest::Client, cache: &Path) -> Fetching<String> {
    let page = text(client, "https://soundcloud.com/").await?;
    let scripts: Vec<String> = SCRIPT
        .captures_iter(&page)
        .map(|capture| capture[1].to_owned())
        .collect();
    for script in scripts.iter().rev() {
        if let Some(id) = client_id_in(&text(client, script).await?) {
            tokio::fs::create_dir_all(cache).await?;
            tokio::fs::write(cache.join(CLIENT_ID_FILE), &id).await?;
            return Ok(id);
        }
    }
    Err(site_failure("soundcloud: client_id not found"))
}

#[tracing::instrument(skip(client, cache))]
pub async fn extract(client: &reqwest::Client, url: &str, cache: &Path) -> Fetching<Found> {
    let mut client_id = match tokio::fs::read_to_string(cache.join(CLIENT_ID_FILE)).await {
        Ok(id) => id.trim().to_owned(),
        Err(_) => scrape_client_id(client, cache).await?,
    };
    let mut retried = false;
    let track: Value = loop {
        let response = client
            .get(format!("{API}/resolve"))
            .query(&[("url", url), ("client_id", client_id.as_str())])
            .send()
            .await?;
        if matches!(response.status().as_u16(), 401 | 403) && !retried {
            retried = true;
            client_id = scrape_client_id(client, cache).await?;
            continue;
        }
        break response.error_for_status()?.json().await?;
    };
    let choice = choose(&track)?;
    let authorization = text_at(&track, "/track_authorization");
    let located: Value = client
        .get(&choice.url)
        .query(&[
            ("client_id", client_id.as_str()),
            ("track_authorization", authorization.as_str()),
        ])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let stream_url = text_at(&located, "/url");
    Ok(Found {
        stream: if choice.progressive {
            Stream::Whole { url: stream_url }
        } else {
            Stream::Hls {
                playlist: stream_url,
            }
        },
        title: text_at(&track, "/title"),
        artist: text_at(&track, "/user/username"),
        extension: choice.extension,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{choose, client_id_in, track_url};

    #[test]
    fn track_urls_drop_queries_and_sets_need_two_segments() {
        assert_eq!(
            track_url("https://soundcloud.com/forss/flickermood?in=x").as_deref(),
            Some("https://soundcloud.com/forss/flickermood")
        );
        assert_eq!(track_url("https://soundcloud.com/forss"), None);
    }

    #[test]
    fn plain_aac_hls_beats_encrypted_and_mp3() {
        let track = json!({"media": {"transcodings": [
            {"url": "mp3", "preset": "mp3_1_0", "format": {"protocol": "progressive"}},
            {"url": "aac-enc", "preset": "aac_256k", "format": {"protocol": "ctr-encrypted-hls"}},
            {"url": "aac-160", "preset": "aac_160k", "format": {"protocol": "hls"}},
            {"url": "aac-96", "preset": "aac_96k", "format": {"protocol": "hls"}},
            {"url": "abr", "preset": "abr_sq", "format": {"protocol": "hls"}}
        ]}});
        let choice = choose(&track).unwrap();
        assert_eq!(
            (choice.url.as_str(), choice.progressive, choice.extension),
            ("aac-160", false, "m4a")
        );
    }

    #[test]
    fn progressive_mp3_is_the_last_resort() {
        let track = json!({"media": {"transcodings": [
            {"url": "mp3", "preset": "mp3_1_0", "format": {"protocol": "progressive"}}
        ]}});
        let choice = choose(&track).unwrap();
        assert_eq!((choice.progressive, choice.extension), (true, "mp3"));
    }

    #[test]
    fn client_id_is_read_from_the_app_script() {
        let script = r#"...,client_id:"abcdefghijABCDEFGHIJ0123456789ab",env:"production"..."#;
        assert_eq!(
            client_id_in(script).as_deref(),
            Some("abcdefghijABCDEFGHIJ0123456789ab")
        );
        assert_eq!(client_id_in("nothing"), None);
    }
}
