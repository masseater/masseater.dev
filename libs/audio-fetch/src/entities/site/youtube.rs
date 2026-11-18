use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Value, json};

use super::{Found, Stream, text_at};
use crate::shared::error::{Fetching, site_failure};

const PLAYER: &str = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const VISION: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const CLIENT_NAME: &str = "VISIONOS";
const CLIENT_NUMBER: &str = "101";
const CLIENT_VERSION: &str = "1.02";

static VIDEO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/|live/)|youtu\.be/)([0-9A-Za-z_-]{11})")
        .expect("valid pattern")
});

#[must_use]
pub fn video_id(url: &str) -> Option<String> {
    Some(VIDEO.captures(url)?.get(1)?.as_str().to_owned())
}

fn is_default_audio(format: &Value) -> bool {
    let audio = format["mimeType"]
        .as_str()
        .is_some_and(|mime| mime.starts_with("audio/"));
    let default_track = format["audioTrack"].is_null()
        || format["audioTrack"]["audioIsDefault"].as_bool() == Some(true);
    audio && format["url"].is_string() && default_track
}

pub fn choose(player: &Value) -> Fetching<Found> {
    let status = player["playabilityStatus"]["status"]
        .as_str()
        .unwrap_or_default();
    if status != "OK" {
        return Err(site_failure(format!(
            "youtube playability {status}: {}",
            player["playabilityStatus"]["reason"]
        )));
    }
    let best = player["streamingData"]["adaptiveFormats"]
        .as_array()
        .ok_or_else(|| site_failure("youtube: no adaptiveFormats"))?
        .iter()
        .filter(|format| is_default_audio(format))
        .max_by_key(|format| {
            let opus = format["mimeType"]
                .as_str()
                .is_some_and(|mime| mime.contains("opus"));
            (opus, format["bitrate"].as_u64().unwrap_or(0))
        })
        .ok_or_else(|| site_failure("youtube: no direct audio format"))?;
    let length = best["contentLength"]
        .as_str()
        .and_then(|length| length.parse().ok())
        .ok_or_else(|| site_failure("youtube: no contentLength"))?;
    let webm = best["mimeType"]
        .as_str()
        .is_some_and(|mime| mime.contains("webm"));
    Ok(Found {
        stream: Stream::Ranged {
            url: text_at(best, "/url"),
            length,
        },
        title: text_at(player, "/videoDetails/title"),
        artist: text_at(player, "/videoDetails/author"),
        extension: if webm { "webm" } else { "m4a" },
    })
}

#[tracing::instrument(skip(client))]
pub async fn extract(client: &reqwest::Client, id: &str) -> Fetching<Found> {
    let body = json!({
        "context": {"client": {
            "clientName": CLIENT_NAME, "clientVersion": CLIENT_VERSION, "deviceMake": "Apple",
            "deviceModel": "RealityDevice17,1", "userAgent": VISION, "osName": "visionOS",
            "osVersion": "26.5.23O471", "hl": "en"
        }},
        "videoId": id,
        "playbackContext": {"contentPlaybackContext": {"html5Preference": "HTML5_PREF_WANTS"}},
        "contentCheckOk": true,
        "racyCheckOk": true
    });
    let player: Value = client
        .post(PLAYER)
        .header(reqwest::header::USER_AGENT, VISION)
        .header("X-YouTube-Client-Name", CLIENT_NUMBER)
        .header("X-YouTube-Client-Version", CLIENT_VERSION)
        .header(reqwest::header::ORIGIN, "https://www.youtube.com")
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    choose(&player)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{choose, video_id};
    use crate::entities::site::Stream;

    #[test]
    fn video_ids_come_from_every_link_shape() {
        for url in [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ?t=3",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
        ] {
            assert_eq!(video_id(url).as_deref(), Some("dQw4w9WgXcQ"), "{url}");
        }
        assert_eq!(video_id("https://www.youtube.com/channel/abc"), None);
    }

    #[test]
    fn highest_bitrate_opus_on_the_default_track_wins() {
        let player = json!({
            "playabilityStatus": {"status": "OK"},
            "videoDetails": {"title": "Song", "author": "Artist"},
            "streamingData": {"adaptiveFormats": [
                {"mimeType": "video/mp4", "url": "v", "bitrate": 999_999, "contentLength": "1"},
                {"mimeType": "audio/mp4; codecs=\"mp4a.40.2\"", "url": "aac", "bitrate": 200_000, "contentLength": "2"},
                {"mimeType": "audio/webm; codecs=\"opus\"", "url": "opus-low", "bitrate": 70_000, "contentLength": "3"},
                {"mimeType": "audio/webm; codecs=\"opus\"", "url": "opus-high", "bitrate": 160_000, "contentLength": "4"},
                {"mimeType": "audio/webm; codecs=\"opus\"", "url": "dub", "bitrate": 170_000, "contentLength": "5",
                 "audioTrack": {"audioIsDefault": false}},
                {"mimeType": "audio/webm; codecs=\"opus\"", "signatureCipher": "s=1", "bitrate": 180_000, "contentLength": "6"}
            ]}
        });
        let found = choose(&player).unwrap();
        assert_eq!(
            found.stream,
            Stream::Ranged {
                url: "opus-high".into(),
                length: 4
            }
        );
        assert_eq!(
            (found.title.as_str(), found.artist.as_str(), found.extension),
            ("Song", "Artist", "webm")
        );
    }

    #[test]
    fn unplayable_videos_fail() {
        let player =
            json!({"playabilityStatus": {"status": "LOGIN_REQUIRED", "reason": "Sign in"}});
        assert!(choose(&player).is_err());
    }
}
