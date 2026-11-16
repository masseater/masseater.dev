use std::sync::LazyLock;

use regex::Regex;
use url::Url;

use crate::protocol::{Site, Source};

const SECONDS_PER_MINUTE: u64 = 60;
const NESTED_YOUTUBE: [&str; 3] = ["shorts", "live", "embed"];
const HOST_PREFIXES: [&str; 4] = ["www.", "m.", "music.", "sp."];

static YOUTUBE_ID: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[\w-]{11}$").expect("valid YouTube id pattern"));
static NICONICO_ID: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(?:sm|so|nm)\d+$").expect("valid niconico id pattern"));

fn accepted(site: Site, id: Option<&str>, pattern: &Regex) -> Option<Source> {
    id.filter(|value| pattern.is_match(value))
        .map(|value| Source {
            site,
            id: value.to_owned(),
        })
}

fn youtube_id<'a>(parts: &[&'a str], video: Option<&'a str>) -> Option<&'a str> {
    match parts.first() {
        Some(&"watch") => video,
        Some(first) if NESTED_YOUTUBE.contains(first) => parts.get(1).copied(),
        _ => None,
    }
}

fn bare_host(host: &str) -> &str {
    HOST_PREFIXES
        .iter()
        .find_map(|prefix| host.strip_prefix(prefix))
        .unwrap_or(host)
}

#[must_use]
pub fn source_of(text: &str) -> Option<Source> {
    let url = Url::parse(text.trim()).ok()?;
    let host = bare_host(url.host_str()?);
    let parts: Vec<&str> = url.path_segments().map_or_else(Vec::new, |segments| {
        segments.filter(|part| !part.is_empty()).collect()
    });
    let video = url
        .query_pairs()
        .find(|(key, _)| key == "v")
        .map(|(_, value)| value.into_owned());
    match host {
        "youtube.com" => accepted(
            Site::Youtube,
            youtube_id(&parts, video.as_deref()),
            &YOUTUBE_ID,
        ),
        "youtu.be" => accepted(Site::Youtube, parts.first().copied(), &YOUTUBE_ID),
        "nicovideo.jp" => accepted(Site::Niconico, parts.get(1).copied(), &NICONICO_ID),
        "nico.ms" => accepted(Site::Niconico, parts.first().copied(), &NICONICO_ID),
        "soundcloud.com" if parts.len() == 2 => Some(Source {
            site: Site::Soundcloud,
            id: parts.join("/"),
        }),
        _ => None,
    }
}

#[must_use]
pub fn page_of(source: &Source) -> Option<String> {
    match source.site {
        Site::Youtube => Some(format!("https://www.youtube.com/watch?v={}", source.id)),
        Site::Niconico => Some(format!("https://www.nicovideo.jp/watch/{}", source.id)),
        Site::Soundcloud => Some(format!("https://soundcloud.com/{}", source.id)),
        Site::File => None,
    }
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "only finite positive seconds reach the cast"
)]
fn whole(seconds: f64) -> u64 {
    if seconds.is_finite() && seconds > 0.0 {
        seconds.floor() as u64
    } else {
        0
    }
}

#[must_use]
pub fn clock(seconds: f64) -> String {
    let total = whole(seconds);
    format!(
        "{}:{:02}",
        total / SECONDS_PER_MINUTE,
        total % SECONDS_PER_MINUTE
    )
}

#[must_use]
pub fn range(from: f64, to: f64) -> String {
    format!("{}–{}", clock(from), clock(to))
}

#[must_use]
pub fn link_at(source: &Source, seconds: f64) -> Option<String> {
    match source.site {
        Site::Youtube => Some(format!(
            "https://youtu.be/{}?t={}",
            source.id,
            whole(seconds)
        )),
        Site::Niconico => Some(format!(
            "https://www.nicovideo.jp/watch/{}?from={}",
            source.id,
            whole(seconds)
        )),
        Site::Soundcloud => Some(format!(
            "https://soundcloud.com/{}#t={}",
            source.id,
            clock(seconds)
        )),
        Site::File => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{clock, link_at, page_of, range, source_of};
    use crate::protocol::{Site, Source};

    fn source(site: Site, id: &str) -> Source {
        Source {
            site,
            id: id.to_owned(),
        }
    }

    #[test]
    fn reads_every_site_link() {
        let youtube = Some(source(Site::Youtube, "dQw4w9WgXcQ"));
        assert_eq!(
            source_of("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3"),
            youtube
        );
        assert_eq!(source_of("https://youtu.be/dQw4w9WgXcQ"), youtube);
        assert_eq!(
            source_of("https://m.youtube.com/shorts/dQw4w9WgXcQ"),
            youtube
        );
        assert_eq!(
            source_of("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
            youtube
        );
        let niconico = Some(source(Site::Niconico, "sm9"));
        assert_eq!(source_of("https://www.nicovideo.jp/watch/sm9"), niconico);
        assert_eq!(source_of("https://sp.nicovideo.jp/watch/sm9"), niconico);
        assert_eq!(source_of("https://nico.ms/sm9"), niconico);
        assert_eq!(
            source_of(" https://soundcloud.com/artist/track "),
            Some(source(Site::Soundcloud, "artist/track"))
        );
    }

    #[test]
    fn refuses_links_that_are_not_media() {
        assert_eq!(source_of("https://www.youtube.com/@channel"), None);
        assert_eq!(source_of("https://soundcloud.com/artist"), None);
        assert_eq!(source_of("https://example.com/watch?v=dQw4w9WgXcQ"), None);
        assert_eq!(source_of("https://www.youtube.com/watch?v=short"), None);
        assert_eq!(source_of("https://www.nicovideo.jp/watch/lv123"), None);
        assert_eq!(source_of("not a link"), None);
    }

    #[test]
    fn links_to_the_moment() {
        let song = source(Site::Soundcloud, "artist/track");
        assert_eq!(clock(83.9), "1:23");
        assert_eq!(clock(-4.0), "0:00");
        assert_eq!(range(61.5, 75.0), "1:01–1:15");
        assert_eq!(
            link_at(&song, 83.9).as_deref(),
            Some("https://soundcloud.com/artist/track#t=1:23")
        );
    }

    #[test]
    fn files_have_no_page() {
        let file = source(Site::File, "abc");
        assert_eq!(page_of(&file), None);
        assert_eq!(link_at(&file, 3.0), None);
    }
}
