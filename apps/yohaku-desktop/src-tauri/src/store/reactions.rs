use rusqlite::{Connection, params};

use crate::model::Reaction;

use super::now;

pub fn log(connection: &Connection, reaction: Reaction) -> rusqlite::Result<()> {
    connection.execute(
        "insert into reactions (reaction, at) values (?1, ?2)",
        params![reaction.as_str(), now()],
    )?;
    Ok(())
}
