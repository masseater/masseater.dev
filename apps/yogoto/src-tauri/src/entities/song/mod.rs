use std::path::{Path, PathBuf};

use media_notes::{Failure, Outcome, fresh_id, is_id, now};

use crate::shared::protocol::{SONG_MANIFEST, Song};

const SONGS: &str = "songs";

#[derive(Clone)]
pub struct Library {
    root: PathBuf,
}

impl Library {
    pub fn open(root: &Path) -> Outcome<Self> {
        std::fs::create_dir_all(root.join(SONGS))?;
        Ok(Self {
            root: root.to_path_buf(),
        })
    }

    pub fn folder(&self, id: &str) -> Outcome<PathBuf> {
        if !is_id(id) {
            return Err(Failure::new("not a song id"));
        }
        Ok(self.root.join(SONGS).join(id))
    }

    pub fn path(&self, song: &Song, relative: &str) -> Outcome<PathBuf> {
        Ok(self.folder(&song.id)?.join(relative))
    }

    pub fn list(&self) -> Outcome<Vec<Song>> {
        let mut songs = Vec::new();
        for entry in std::fs::read_dir(self.root.join(SONGS))? {
            let manifest = entry?.path().join(SONG_MANIFEST);
            if manifest.is_file() {
                songs.push(serde_json::from_slice::<Song>(&std::fs::read(manifest)?)?);
            }
        }
        songs.sort_by_key(|song| std::cmp::Reverse(song.added_at));
        Ok(songs)
    }

    pub fn get(&self, id: &str) -> Outcome<Option<Song>> {
        let manifest = self.folder(id)?.join(SONG_MANIFEST);
        if !manifest.is_file() {
            return Ok(None);
        }
        Ok(Some(serde_json::from_slice(&std::fs::read(manifest)?)?))
    }

    pub fn save(&self, song: &Song) -> Outcome<()> {
        let folder = self.folder(&song.id)?;
        std::fs::create_dir_all(&folder)?;
        let staging = folder.join(format!("{SONG_MANIFEST}.partial"));
        std::fs::write(&staging, serde_json::to_vec_pretty(song)?)?;
        std::fs::rename(staging, folder.join(SONG_MANIFEST))?;
        Ok(())
    }

    pub fn create(&self, title: &str, artist: &str) -> Outcome<Song> {
        let song = Song {
            id: fresh_id(),
            title: title.to_owned(),
            artist: artist.to_owned(),
            added_at: now(),
            primary: String::new(),
            sources: Vec::new(),
            separations: Vec::new(),
            analysis: None,
        };
        std::fs::create_dir_all(self.folder(&song.id)?)?;
        Ok(song)
    }

    pub fn remove(&self, id: &str) -> Outcome<bool> {
        let folder = self.folder(id)?;
        if !folder.join(SONG_MANIFEST).is_file() {
            return Ok(false);
        }
        std::fs::remove_dir_all(folder)?;
        Ok(true)
    }

    pub fn find_by_digest(&self, sha256: &str) -> Outcome<Option<Song>> {
        Ok(self
            .list()?
            .into_iter()
            .find(|song| song.sources.iter().any(|source| source.sha256 == sha256)))
    }
}

#[cfg(test)]
mod tests {
    use super::Library;
    use crate::shared::protocol::{Origin, SONG_MANIFEST, SongSource};

    #[test]
    fn ids_the_app_did_not_make_never_reach_the_file_system() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(&directory.path().join("library")).unwrap();
        let outside = directory.path().join("outside");
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::write(outside.join(SONG_MANIFEST), "{}").unwrap();
        let mut song = library.create("Song", "").unwrap();
        for id in [outside.to_str().unwrap(), "../../outside", "..", ""] {
            assert!(library.get(id).is_err());
            assert!(library.remove(id).is_err());
            song.id = id.to_owned();
            assert!(library.save(&song).is_err());
        }
        assert!(outside.join(SONG_MANIFEST).is_file());
    }

    #[test]
    fn saved_songs_list_newest_first_and_match_by_digest() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(directory.path()).unwrap();
        let mut first = library.create("First", "A").unwrap();
        first.added_at = 1;
        first.sources.push(SongSource {
            id: "s".into(),
            origin: Origin::File {
                name: "a.flac".into(),
            },
            file: "sources/s.flac".into(),
            sha256: "abc".into(),
            sample_rate: 44_100,
            frames: 10,
            added_at: 1,
        });
        library.save(&first).unwrap();
        let mut second = library.create("Second", "B").unwrap();
        second.added_at = 2;
        library.save(&second).unwrap();
        let titles: Vec<String> = library
            .list()
            .unwrap()
            .into_iter()
            .map(|song| song.title)
            .collect();
        assert_eq!(titles, ["Second", "First"]);
        assert_eq!(
            library.find_by_digest("abc").unwrap().map(|song| song.id),
            Some(first.id.clone())
        );
        assert!(library.remove(&first.id).unwrap());
        assert_eq!(library.get(&first.id).unwrap(), None);
    }
}
