use std::path::Path;

use crate::shared::error::{Fetching, site_failure};

mod niconico;
mod soundcloud;
mod youtube;

#[derive(Debug, PartialEq, Eq)]
pub enum Stream {
    Ranged { url: String, length: u64 },
    Whole { url: String },
    Hls { playlist: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct Found {
    pub stream: Stream,
    pub title: String,
    pub artist: String,
    pub extension: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Page {
    Youtube(String),
    Niconico(String),
    Soundcloud(String),
}

#[must_use]
pub fn page_of(url: &str) -> Option<Page> {
    youtube::video_id(url)
        .map(Page::Youtube)
        .or_else(|| niconico::video_id(url).map(Page::Niconico))
        .or_else(|| soundcloud::track_url(url).map(Page::Soundcloud))
}

pub async fn extract(client: &reqwest::Client, url: &str, cache: &Path) -> Fetching<Found> {
    match page_of(url) {
        Some(Page::Youtube(id)) => youtube::extract(client, &id).await,
        Some(Page::Niconico(id)) => niconico::extract(client, &id).await,
        Some(Page::Soundcloud(track)) => soundcloud::extract(client, &track, cache).await,
        None => Err(site_failure(format!("no built-in extractor for {url}"))),
    }
}

fn text_at(value: &serde_json::Value, pointer: &str) -> String {
    value
        .pointer(pointer)
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{Page, page_of};

    #[test]
    fn pages_are_recognised_by_site() {
        assert_eq!(
            page_of("https://youtu.be/dQw4w9WgXcQ"),
            Some(Page::Youtube("dQw4w9WgXcQ".into()))
        );
        assert_eq!(
            page_of("https://www.nicovideo.jp/watch/sm9"),
            Some(Page::Niconico("sm9".into()))
        );
        assert_eq!(
            page_of("https://soundcloud.com/forss/flickermood"),
            Some(Page::Soundcloud(
                "https://soundcloud.com/forss/flickermood".into()
            ))
        );
        assert_eq!(page_of("https://example.com/song.mp3"), None);
    }
}
