use std::sync::LazyLock;

use regex::Regex;
use serde::Deserialize;

use crate::failure::{Failure, Outcome};
use crate::protocol::{Media, Site, Source};
use crate::source::page_of;

const YOUTUBE_OEMBED: &str = "https://www.youtube.com/oembed";
const SOUNDCLOUD_OEMBED: &str = "https://soundcloud.com/oembed";
const NICONICO_INFO: &str = "https://ext.nicovideo.jp/api/getthumbinfo/";
const NICONICO_FOUND: &str = r#"<nicovideo_thumb_response status="ok">"#;

static NICONICO_TITLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<title>([^<]*)</title>").expect("valid title pattern"));
static NICONICO_ARTIST: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<(?:user_nickname|ch_name)>([^<]*)</").expect("valid artist pattern")
});

#[derive(Deserialize)]
struct OEmbed {
    title: String,
    author_name: String,
}

struct Credit {
    title: String,
    artist: String,
}

fn unescaped(text: &str) -> String {
    text.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&")
}

fn captured(pattern: &Regex, text: &str) -> String {
    pattern
        .captures(text)
        .and_then(|found| found.get(1))
        .map_or_else(String::new, |found| unescaped(found.as_str()))
}

fn niconico_credit(text: &str) -> Outcome<Credit> {
    if !text.contains(NICONICO_FOUND) {
        return Err(Failure::new("niconico has no such video"));
    }
    Ok(Credit {
        title: captured(&NICONICO_TITLE, text),
        artist: captured(&NICONICO_ARTIST, text),
    })
}

async fn oembed(client: &reqwest::Client, endpoint: &str, source: &Source) -> Outcome<Credit> {
    let page = page_of(source).ok_or_else(|| Failure::new("a file has no page"))?;
    let found: OEmbed = client
        .get(endpoint)
        .query(&[("format", "json"), ("url", &page)])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(Credit {
        title: found.title,
        artist: found.author_name,
    })
}

async fn niconico(client: &reqwest::Client, source: &Source) -> Outcome<Credit> {
    let text = client
        .get(format!("{NICONICO_INFO}{}", source.id))
        .send()
        .await?
        .error_for_status()?
        .text()
        .await?;
    niconico_credit(&text)
}

async fn credit(client: &reqwest::Client, source: &Source) -> Outcome<Credit> {
    match source.site {
        Site::Youtube => oembed(client, YOUTUBE_OEMBED, source).await,
        Site::Soundcloud => oembed(client, SOUNDCLOUD_OEMBED, source).await,
        Site::Niconico => niconico(client, source).await,
        Site::File => Err(Failure::new("a file has no credit online")),
    }
}

pub async fn media_of(client: &reqwest::Client, source: Source) -> Media {
    match credit(client, &source).await {
        Ok(Credit { title, artist }) => Media {
            source,
            title,
            artist,
        },
        Err(failure) => {
            eprintln!("credit lookup failed: {failure}");
            Media {
                title: source.id.clone(),
                source,
                artist: String::new(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::niconico_credit;

    #[test]
    fn reads_niconico_credits() {
        let credit = niconico_credit(
            r#"<nicovideo_thumb_response status="ok"><thumb><title>Tom &amp; Jerry&#39;s</title><user_nickname>作者</user_nickname></thumb>"#,
        )
        .expect("credit");
        assert_eq!(credit.title, "Tom & Jerry's");
        assert_eq!(credit.artist, "作者");
    }

    #[test]
    fn refuses_pages_that_are_not_thumb_info() {
        assert!(niconico_credit("<html><title>ニコニコ動画</title></html>").is_err());
    }
}
