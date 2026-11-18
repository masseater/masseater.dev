use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};

use regex::Regex;
use serde_json::{Value, json};

use super::{Found, Stream, text_at};
use crate::shared::error::{Fetching, site_failure};
use crate::shared::hls::audio_rendition;
use crate::shared::http::text;

static VIDEO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:nicovideo\.jp/watch/|nico\.ms/)((?:sm|nm|so)?\d+)").expect("valid pattern")
});

#[must_use]
pub fn video_id(url: &str) -> Option<String> {
    Some(VIDEO.captures(url)?.get(1)?.as_str().to_owned())
}

pub struct Watch {
    pub track: String,
    pub access_key: String,
    pub video: Value,
    pub audio: Value,
    pub title: String,
    pub artist: String,
}

fn available(domand: &Value, kind: &str) -> Vec<Value> {
    domand[kind].as_array().map_or_default(|formats| {
        formats
            .iter()
            .filter(|format| format["isAvailable"].as_bool() == Some(true))
            .cloned()
            .collect()
    })
}

fn quality(format: &Value) -> i64 {
    format["qualityLevel"].as_i64().unwrap_or(0)
}

pub fn watch_of(api: &Value) -> Fetching<Watch> {
    if api["meta"]["status"].as_u64() != Some(200) {
        return Err(site_failure(format!(
            "niconico {}: {}",
            api["meta"]["status"], api["data"]["reasonCode"]
        )));
    }
    let data = &api["data"];
    let domand = &data["media"]["domand"];
    let video = available(domand, "videos")
        .into_iter()
        .min_by_key(quality)
        .ok_or_else(|| site_failure("niconico: no video"))?;
    let audio = available(domand, "audios")
        .into_iter()
        .max_by_key(quality)
        .ok_or_else(|| site_failure("niconico: no audio"))?;
    let owner = text_at(data, "/owner/nickname");
    Ok(Watch {
        track: text_at(data, "/client/watchTrackId"),
        access_key: text_at(domand, "/accessRightKey"),
        video,
        audio,
        title: text_at(data, "/video/title"),
        artist: if owner.is_empty() {
            text_at(data, "/channel/name")
        } else {
            owner
        },
    })
}

fn frontend(request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    request
        .header("X-Frontend-ID", "6")
        .header("X-Frontend-Version", "0")
}

#[tracing::instrument(skip(client))]
pub async fn extract(client: &reqwest::Client, id: &str) -> Fetching<Found> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let api: Value = frontend(client.get(format!(
        "https://www.nicovideo.jp/api/watch/v3_guest/{id}?actionTrackId=AAAAAAAAAA_{now}"
    )))
    .send()
    .await?
    .json()
    .await?;
    let watch = watch_of(&api)?;
    let rights: Value = frontend(client.post(format!(
        "https://nvapi.nicovideo.jp/v1/watch/{id}/access-rights/hls?actionTrackId={}",
        watch.track
    )))
    .header("X-Request-With", "https://www.nicovideo.jp")
    .header("X-Access-Right-Key", &watch.access_key)
    .json(&json!({"outputs": [[watch.video["id"], watch.audio["id"]]]}))
    .send()
    .await?
    .error_for_status()?
    .json()
    .await?;
    let master_url = text_at(&rights, "/data/contentUrl");
    let master = text(client, &master_url).await?;
    let playlist = audio_rendition(&master_url, &master)?
        .ok_or_else(|| site_failure("niconico: no audio rendition"))?;
    Ok(Found {
        stream: Stream::Hls { playlist },
        title: watch.title,
        artist: watch.artist,
        extension: "m4a",
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{video_id, watch_of};

    #[test]
    fn video_ids_come_from_watch_and_short_links() {
        assert_eq!(
            video_id("https://www.nicovideo.jp/watch/sm9?ref=x").as_deref(),
            Some("sm9")
        );
        assert_eq!(video_id("https://nico.ms/so123").as_deref(), Some("so123"));
        assert_eq!(video_id("https://www.nicovideo.jp/user/1"), None);
    }

    #[test]
    fn best_audio_rides_with_the_smallest_video() {
        let api = json!({
            "meta": {"status": 200},
            "data": {
                "client": {"watchTrackId": "track"},
                "video": {"title": "Song"},
                "owner": null,
                "channel": {"name": "Channel"},
                "media": {"domand": {
                    "accessRightKey": "key",
                    "videos": [
                        {"id": "v1080", "isAvailable": true, "qualityLevel": 4},
                        {"id": "v360", "isAvailable": true, "qualityLevel": 1},
                        {"id": "v144", "isAvailable": false, "qualityLevel": 0}
                    ],
                    "audios": [
                        {"id": "a64", "isAvailable": true, "qualityLevel": 0},
                        {"id": "a192", "isAvailable": true, "qualityLevel": 2}
                    ]
                }}
            }
        });
        let watch = watch_of(&api).unwrap();
        assert_eq!(
            (watch.video["id"].as_str(), watch.audio["id"].as_str()),
            (Some("v360"), Some("a192"))
        );
        assert_eq!(
            (watch.title.as_str(), watch.artist.as_str()),
            ("Song", "Channel")
        );
        assert_eq!(
            (watch.track.as_str(), watch.access_key.as_str()),
            ("track", "key")
        );
    }

    #[test]
    fn rejected_watch_pages_fail() {
        assert!(
            watch_of(&json!({"meta": {"status": 403}, "data": {"reasonCode": "PPV_VIDEO"}}))
                .is_err()
        );
    }
}
