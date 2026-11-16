use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};

use crate::failure::Outcome;
use crate::protocol::{Mark, MarkInput, Saved, Source};

const DATABASE_FILE: &str = "shirushi.db";
const SCHEMA: &str = "CREATE TABLE IF NOT EXISTS marks (
    id TEXT PRIMARY KEY NOT NULL,
    site TEXT NOT NULL,
    source_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marks_source ON marks (site, source_id, created_at);";

#[derive(Clone)]
pub struct Store(Arc<Mutex<Connection>>);

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX)
        })
}

fn marks_from(rows: &[String]) -> Outcome<Vec<Mark>> {
    rows.iter()
        .map(|body| Ok(serde_json::from_str(body)?))
        .collect()
}

impl Store {
    pub fn open(directory: &Path) -> Outcome<Self> {
        fs::create_dir_all(directory)?;
        Self::prepare(Connection::open(directory.join(DATABASE_FILE))?)
    }

    #[cfg(test)]
    pub fn in_memory() -> Outcome<Self> {
        Self::prepare(Connection::open_in_memory()?)
    }

    fn prepare(connection: Connection) -> Outcome<Self> {
        connection.execute_batch(SCHEMA)?;
        Ok(Self(Arc::new(Mutex::new(connection))))
    }

    fn with<T>(&self, work: impl FnOnce(&Connection) -> Outcome<T>) -> Outcome<T> {
        let connection = self.0.lock().unwrap_or_else(PoisonError::into_inner);
        work(&connection)
    }

    pub fn list(&self, source: Option<&Source>) -> Outcome<Vec<Mark>> {
        self.with(|connection| {
            let rows = match source {
                None => connection
                    .prepare("SELECT body FROM marks ORDER BY created_at DESC, id DESC")?
                    .query_map([], |row| row.get(0))?
                    .collect::<rusqlite::Result<Vec<String>>>()?,
                Some(source) => connection
                    .prepare(
                        "SELECT body FROM marks WHERE site = ?1 AND source_id = ?2 ORDER BY created_at DESC, id DESC",
                    )?
                    .query_map(params![source.site.as_str(), source.id], |row| row.get(0))?
                    .collect::<rusqlite::Result<Vec<String>>>()?,
            };
            marks_from(&rows)
        })
    }

    pub fn save(&self, input: MarkInput) -> Outcome<Saved> {
        let saved = Saved {
            id: uuid::Uuid::now_v7().to_string(),
            at: now(),
        };
        let mark = Mark {
            id: saved.id.clone(),
            song: input.song,
            from: input.from,
            to: input.to,
            verb: input.verb,
            aspects: input.aspects,
            words: input.words,
            at: saved.at,
        };
        let body = serde_json::to_string(&mark)?;
        self.with(|connection| {
            connection.execute(
                "INSERT INTO marks (id, site, source_id, created_at, body) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    mark.id,
                    mark.song.source.site.as_str(),
                    mark.song.source.id,
                    mark.at,
                    body
                ],
            )?;
            Ok(())
        })?;
        Ok(saved)
    }

    pub fn remove(&self, id: &str) -> Outcome<bool> {
        self.with(|connection| {
            let removed = connection
                .query_row(
                    "DELETE FROM marks WHERE id = ?1 RETURNING id",
                    params![id],
                    |row| row.get::<_, String>(0),
                )
                .optional()?;
            Ok(removed.is_some())
        })
    }
}

#[cfg(test)]
pub mod tests {
    use super::Store;
    use crate::protocol::{Aspect, MarkInput, Site, Song, Source, Verb};

    pub fn input(id: &str, verb: Verb) -> MarkInput {
        MarkInput {
            song: Song {
                source: Source {
                    site: Site::Youtube,
                    id: id.to_owned(),
                },
                title: "曲".to_owned(),
                artist: "作者".to_owned(),
            },
            from: 61.5,
            to: 75.0,
            verb,
            aspects: vec![Aspect::Bass, Aspect::Chords],
            words: "ベースが跳ねる".to_owned(),
        }
    }

    #[test]
    fn keeps_marks_newest_first_per_song() {
        let store = Store::in_memory().expect("store");
        let first = store.save(input("aaaaaaaaaaa", Verb::Like)).expect("first");
        let second = store
            .save(input("aaaaaaaaaaa", Verb::Dislike))
            .expect("second");
        store
            .save(input("bbbbbbbbbbb", Verb::Like))
            .expect("other song");
        let song = Source {
            site: Site::Youtube,
            id: "aaaaaaaaaaa".to_owned(),
        };
        let ids: Vec<String> = store
            .list(Some(&song))
            .expect("song marks")
            .into_iter()
            .map(|mark| mark.id)
            .collect();
        assert_eq!(ids, vec![second.id, first.id]);
        assert_eq!(store.list(None).expect("all marks").len(), 3);
    }

    #[test]
    fn removes_a_mark_once() {
        let store = Store::in_memory().expect("store");
        let saved = store.save(input("aaaaaaaaaaa", Verb::Like)).expect("saved");
        assert!(store.remove(&saved.id).expect("first removal"));
        assert!(!store.remove(&saved.id).expect("second removal"));
        assert_eq!(store.list(None).expect("marks").len(), 0);
    }
}
