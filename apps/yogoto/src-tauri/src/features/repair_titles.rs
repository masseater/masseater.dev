use std::path::Path;

use audio_fetch::features::describe_audio::describe_audio;
use media_notes::Outcome;

use crate::entities::song::Library;
use crate::shared::protocol::{Origin, Song};

const GARBLED: char = '\u{FFFD}';

fn garbled(song: &Song) -> bool {
    song.title.contains(GARBLED) || song.artist.contains(GARBLED)
}

fn url_of(song: &Song) -> Option<&str> {
    song.sources.iter().find_map(|source| match &source.origin {
        Origin::Url { url, .. } => Some(url.as_str()),
        Origin::File { .. } => None,
    })
}

#[tracing::instrument(skip_all)]
pub async fn repair_titles(
    library: &Library,
    client: &reqwest::Client,
    cache: &Path,
) -> Outcome<usize> {
    let mut repaired = 0;
    for mut song in library.list()?.into_iter().filter(garbled) {
        let Some(url) = url_of(&song).map(str::to_owned) else {
            continue;
        };
        match describe_audio(client, &url, cache).await {
            Ok(described) => {
                song.title = described.title;
                song.artist = described.artist;
                library.save(&song)?;
                repaired += 1;
            }
            Err(error) => tracing::warn!(%error, url, "title could not be looked up again"),
        }
    }
    Ok(repaired)
}

#[cfg(test)]
mod tests {
    use super::repair_titles;
    use crate::entities::song::Library;

    #[tokio::test]
    async fn songs_without_garbled_titles_are_left_alone() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(directory.path()).unwrap();
        let mut song = library.create("ひとり\u{FFFD}", "").unwrap();
        library.save(&song).unwrap();
        song = library.create("夜ごと", "誰か").unwrap();
        library.save(&song).unwrap();
        let repaired = repair_titles(&library, &reqwest::Client::new(), directory.path())
            .await
            .unwrap();
        assert_eq!(repaired, 0);
        assert_eq!(library.get(&song.id).unwrap().unwrap().title, "夜ごと");
    }
}
