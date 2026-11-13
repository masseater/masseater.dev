use rusqlite::{Connection, OptionalExtension, params};

#[derive(Clone, Copy)]
pub enum Key {
    ClientId,
    RefreshToken,
    Cursor,
}

impl Key {
    const fn as_str(self) -> &'static str {
        match self {
            Self::ClientId => "client_id",
            Self::RefreshToken => "refresh_token",
            Self::Cursor => "cursor",
        }
    }
}

pub fn read(connection: &Connection, key: Key) -> rusqlite::Result<Option<String>> {
    connection
        .query_row(
            "select value from sync_state where key = ?1",
            params![key.as_str()],
            |row| row.get(0),
        )
        .optional()
}

pub fn write(connection: &Connection, key: Key, value: &str) -> rusqlite::Result<()> {
    connection.execute(
        "insert into sync_state (key, value) values (?1, ?2)
          on conflict (key) do update set value = excluded.value",
        params![key.as_str(), value],
    )?;
    Ok(())
}

pub fn clear(connection: &Connection, key: Key) -> rusqlite::Result<()> {
    connection.execute(
        "delete from sync_state where key = ?1",
        params![key.as_str()],
    )?;
    Ok(())
}
