use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;

use crate::failure::Outcome;

pub mod dismissals;
pub mod kinds;
pub mod manuscripts;
mod migrations;
pub mod reactions;
pub mod sources;

const DATABASE_FILE: &str = "yohaku.db";

#[derive(Clone)]
pub struct Store(Arc<Mutex<Connection>>);

impl Store {
    pub fn open(directory: &Path) -> Outcome<Self> {
        fs::create_dir_all(directory)?;
        Self::prepare(Connection::open(directory.join(DATABASE_FILE))?)
    }

    #[cfg(test)]
    pub fn in_memory() -> Outcome<Self> {
        Self::prepare(Connection::open_in_memory()?)
    }

    fn prepare(mut connection: Connection) -> Outcome<Self> {
        connection.pragma_update(None, "foreign_keys", "on")?;
        migrations::migrate(&mut connection)?;
        Ok(Self(Arc::new(Mutex::new(connection))))
    }

    pub fn try_with<T>(&self, work: impl FnOnce(&mut Connection) -> Outcome<T>) -> Outcome<T> {
        let mut connection = self.0.lock().unwrap_or_else(PoisonError::into_inner);
        work(&mut connection)
    }

    pub fn with<T>(&self, work: impl FnOnce(&mut Connection) -> rusqlite::Result<T>) -> Outcome<T> {
        let mut connection = self.0.lock().unwrap_or_else(PoisonError::into_inner);
        Ok(work(&mut connection)?)
    }
}

pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX)
        })
}

pub fn fresh_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
