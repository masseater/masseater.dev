use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::failure::Outcome;
use crate::protocol::Source;

#[derive(Clone)]
pub struct Store {
    connection: Arc<Mutex<Connection>>,
    table: &'static str,
}

#[must_use]
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX)
        })
}

#[must_use]
pub fn fresh_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

pub struct Row<'a, T> {
    pub id: &'a str,
    pub source: &'a Source,
    pub at: i64,
    pub value: &'a T,
}

fn decoded<T: DeserializeOwned>(rows: &[String]) -> Outcome<Vec<T>> {
    rows.iter()
        .map(|body| Ok(serde_json::from_str(body)?))
        .collect()
}

impl Store {
    pub fn open(directory: &Path, file: &str, table: &'static str) -> Outcome<Self> {
        fs::create_dir_all(directory)?;
        Self::prepare(Connection::open(directory.join(file))?, table)
    }

    pub fn in_memory(table: &'static str) -> Outcome<Self> {
        Self::prepare(Connection::open_in_memory()?, table)
    }

    fn prepare(connection: Connection, table: &'static str) -> Outcome<Self> {
        connection.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS {table} (
                id TEXT PRIMARY KEY NOT NULL,
                site TEXT NOT NULL,
                source_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                body TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS {table}_source ON {table} (site, source_id, created_at);"
        ))?;
        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
            table,
        })
    }

    fn with<T>(&self, work: impl FnOnce(&Connection) -> Outcome<T>) -> Outcome<T> {
        let connection = self
            .connection
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        work(&connection)
    }

    pub fn list<T: DeserializeOwned>(&self, source: Option<&Source>) -> Outcome<Vec<T>> {
        let table = self.table;
        self.with(|connection| {
            let rows = match source {
                None => connection
                    .prepare(&format!(
                        "SELECT body FROM {table} ORDER BY created_at DESC, id DESC"
                    ))?
                    .query_map([], |row| row.get(0))?
                    .collect::<rusqlite::Result<Vec<String>>>()?,
                Some(source) => connection
                    .prepare(&format!(
                        "SELECT body FROM {table} WHERE site = ?1 AND source_id = ?2 ORDER BY created_at DESC, id DESC"
                    ))?
                    .query_map(params![source.site.as_str(), source.id], |row| row.get(0))?
                    .collect::<rusqlite::Result<Vec<String>>>()?,
            };
            decoded(&rows)
        })
    }

    pub fn get<T: DeserializeOwned>(&self, id: &str) -> Outcome<Option<T>> {
        let table = self.table;
        let body = self.with(|connection| {
            Ok(connection
                .query_row(
                    &format!("SELECT body FROM {table} WHERE id = ?1"),
                    params![id],
                    |row| row.get::<_, String>(0),
                )
                .optional()?)
        })?;
        body.map(|text| Ok(serde_json::from_str(&text)?))
            .transpose()
    }

    pub fn put<T: Serialize>(&self, row: &Row<'_, T>) -> Outcome<()> {
        let table = self.table;
        let body = serde_json::to_string(row.value)?;
        self.with(|connection| {
            connection.execute(
                &format!(
                    "INSERT OR REPLACE INTO {table} (id, site, source_id, created_at, body) VALUES (?1, ?2, ?3, ?4, ?5)"
                ),
                params![row.id, row.source.site.as_str(), row.source.id, row.at, body],
            )?;
            Ok(())
        })
    }

    pub fn remove(&self, id: &str) -> Outcome<bool> {
        let table = self.table;
        self.with(|connection| {
            let removed = connection
                .query_row(
                    &format!("DELETE FROM {table} WHERE id = ?1 RETURNING id"),
                    params![id],
                    |row| row.get::<_, String>(0),
                )
                .optional()?;
            Ok(removed.is_some())
        })
    }
}

#[cfg(test)]
mod tests {
    use serde::{Deserialize, Serialize};

    use super::{Row, Store};
    use crate::protocol::{Site, Source};

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct Note {
        words: String,
    }

    fn source(id: &str) -> Source {
        Source {
            site: Site::Youtube,
            id: id.to_owned(),
        }
    }

    fn note(words: &str) -> Note {
        Note {
            words: words.to_owned(),
        }
    }

    #[test]
    fn keeps_notes_newest_first_per_source() {
        let store = Store::in_memory("notes").expect("store");
        let here = source("aaaaaaaaaaa");
        let there = source("bbbbbbbbbbb");
        for (id, at, place, words) in [
            ("1", 1, &here, "first"),
            ("2", 2, &here, "second"),
            ("3", 3, &there, "elsewhere"),
        ] {
            store
                .put(&Row {
                    id,
                    source: place,
                    at,
                    value: &note(words),
                })
                .expect("saved");
        }
        let notes: Vec<Note> = store.list(Some(&here)).expect("notes here");
        assert_eq!(notes, vec![note("second"), note("first")]);
        assert_eq!(store.list::<Note>(None).expect("every note").len(), 3);
    }

    #[test]
    fn replaces_and_removes_a_note() {
        let store = Store::in_memory("notes").expect("store");
        let here = source("aaaaaaaaaaa");
        let row = |value| Row {
            id: "1",
            source: &here,
            at: 1,
            value,
        };
        let draft = note("draft");
        let last = note("final");
        store.put(&row(&draft)).expect("saved");
        store.put(&row(&last)).expect("replaced");
        assert_eq!(store.get::<Note>("1").expect("read"), Some(note("final")));
        assert!(store.remove("1").expect("first removal"));
        assert!(!store.remove("1").expect("second removal"));
        assert_eq!(store.get::<Note>("1").expect("gone"), None);
    }
}
