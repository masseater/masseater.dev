use std::collections::HashSet;

use rusqlite::{Connection, params};

pub fn dismiss(connection: &Connection, text: &str, rule: &str) -> rusqlite::Result<()> {
    connection.execute(
        "insert into dismissals (text, rule) values (?1, ?2) on conflict do nothing",
        params![text, rule],
    )?;
    Ok(())
}

pub fn all(connection: &Connection) -> rusqlite::Result<HashSet<(String, String)>> {
    connection
        .prepare_cached("select text, rule from dismissals")?
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect()
}
