use std::path::{Path, PathBuf};

use audio_fetch::features::fetch_audio::{Request, fetch_audio};
use media_notes::{Failure, Outcome, fresh_id, now};
use sha2::{Digest, Sha256};

use crate::entities::song::Library;
use crate::shared::lib::decode;
use crate::shared::protocol::{Origin, Song, SongSource};

const SOURCES: &str = "sources";
const INCOMING: &str = "incoming";
const CONCURRENCY: usize = 8;

pub struct Imported {
    pub song: Song,
    pub merged: bool,
}

struct Arrival {
    path: PathBuf,
    title: String,
    artist: String,
    origin: Origin,
}

fn digest_of(path: &Path) -> Outcome<String> {
    let mut hasher = Sha256::new();
    let mut file = std::fs::File::open(path)?;
    let mut buffer = vec![0u8; 1 << 20];
    loop {
        let read = std::io::Read::read(&mut file, &mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .fold(String::with_capacity(64), |mut text, byte| {
            use std::fmt::Write as _;
            let _ = write!(text, "{byte:02x}");
            text
        }))
}

fn extension_of(path: &Path) -> String {
    path.extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("bin")
        .to_ascii_lowercase()
}

fn stem_of(path: &Path) -> String {
    path.file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or_default()
        .to_owned()
}

async fn arrive(
    client: &reqwest::Client,
    cache: &Path,
    incoming: &Path,
    location: &str,
) -> Outcome<Arrival> {
    let local = Path::new(location);
    if local.is_file() {
        let name = local
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_owned();
        let path = incoming.join(format!("source.{}", extension_of(local)));
        tokio::fs::create_dir_all(incoming).await?;
        tokio::fs::copy(local, &path).await?;
        return Ok(Arrival {
            path,
            title: stem_of(local),
            artist: String::new(),
            origin: Origin::File { name },
        });
    }
    let request = Request {
        url: location,
        directory: incoming,
        cache,
        concurrency: CONCURRENCY,
    };
    let fetched = fetch_audio(client, &request)
        .await
        .map_err(|error| Failure::new(error.to_string()))?;
    Ok(Arrival {
        path: fetched.path,
        title: fetched.title,
        artist: fetched.artist,
        origin: Origin::Url {
            url: location.to_owned(),
            route: fetched.route.as_str().to_owned(),
        },
    })
}

#[tracing::instrument(skip(library, client, cache))]
pub async fn import_song(
    library: &Library,
    client: &reqwest::Client,
    cache: &Path,
    location: &str,
) -> Outcome<Imported> {
    let incoming = cache.join(INCOMING).join(fresh_id());
    let arrived = arrive(client, cache, &incoming, location).await;
    let outcome = match arrived {
        Ok(arrival) => settle(library, arrival).await,
        Err(failure) => Err(failure),
    };
    let _ = tokio::fs::remove_dir_all(&incoming).await;
    outcome
}

async fn settle(library: &Library, arrival: Arrival) -> Outcome<Imported> {
    let probed = arrival.path.clone();
    let (sha256, (audio, sample_rate)) = tokio::task::spawn_blocking(move || -> Outcome<_> {
        let sha256 = digest_of(&probed)?;
        let decoded = decode(&probed).map_err(|error| Failure::new(error.to_string()))?;
        Ok((sha256, decoded))
    })
    .await
    .map_err(|error| Failure::new(error.to_string()))??;
    if let Some(song) = library.find_by_digest(&sha256)? {
        return Ok(Imported { song, merged: true });
    }
    let title = if arrival.title.is_empty() {
        stem_of(&arrival.path)
    } else {
        arrival.title
    };
    let mut song = library.create(&title, &arrival.artist)?;
    let id = fresh_id();
    let file = format!("{SOURCES}/{id}.{}", extension_of(&arrival.path));
    let target = library.path(&song, &file)?;
    tokio::fs::create_dir_all(library.folder(&song.id)?.join(SOURCES)).await?;
    if tokio::fs::rename(&arrival.path, &target).await.is_err() {
        tokio::fs::copy(&arrival.path, &target).await?;
    }
    song.sources.push(SongSource {
        id: id.clone(),
        origin: arrival.origin,
        file,
        sha256,
        sample_rate: i64::from(sample_rate),
        frames: i64::try_from(audio[0].len()).map_err(|error| Failure::new(error.to_string()))?,
        added_at: now(),
    });
    song.primary = id;
    library.save(&song)?;
    Ok(Imported {
        song,
        merged: false,
    })
}

#[cfg(test)]
mod tests {
    use super::import_song;
    use crate::entities::song::Library;
    use crate::shared::lib::write_flac;
    use crate::shared::protocol::Origin;

    #[tokio::test]
    async fn local_files_are_kept_unchanged_and_imported_once() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(&directory.path().join("library")).unwrap();
        let file = directory.path().join("My Song.flac");
        let wave: Vec<f32> = (0..4_410u16)
            .map(|index| f32::from(index % 100) / 200.0)
            .collect();
        write_flac(&file, &[wave.clone(), wave], 44_100).unwrap();
        let client = reqwest::Client::new();
        let cache = directory.path().join("cache");
        let location = file.to_str().unwrap();
        let first = import_song(&library, &client, &cache, location)
            .await
            .unwrap();
        assert!(!first.merged);
        let source = &first.song.sources[0];
        assert_eq!(first.song.title, "My Song");
        assert_eq!(
            source.origin,
            Origin::File {
                name: "My Song.flac".into()
            }
        );
        assert_eq!((source.sample_rate, source.frames), (44_100, 4_410));
        let kept = std::fs::read(library.path(&first.song, &source.file).unwrap()).unwrap();
        assert_eq!(kept, std::fs::read(&file).unwrap());
        let second = import_song(&library, &client, &cache, location)
            .await
            .unwrap();
        assert!(second.merged);
        assert_eq!(second.song.id, first.song.id);
        assert_eq!(library.list().unwrap().len(), 1);
    }
}
