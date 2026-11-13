use std::collections::HashMap;

use rusqlite::{Connection, params};

use crate::model::ParagraphKind;

pub fn known(
    connection: &Connection,
    texts: &[String],
) -> rusqlite::Result<HashMap<String, ParagraphKind>> {
    let mut select =
        connection.prepare_cached("select kind from paragraph_kinds where text = ?1")?;
    let mut found = HashMap::new();
    for text in texts {
        let kinds: Vec<String> = select
            .query_map(params![text], |row| row.get(0))?
            .collect::<rusqlite::Result<_>>()?;
        if let Some(kind) = kinds.first().and_then(|kind| ParagraphKind::parse(kind)) {
            found.insert(text.clone(), kind);
        }
    }
    Ok(found)
}

pub fn remember(
    connection: &Connection,
    judged: &[(String, ParagraphKind)],
) -> rusqlite::Result<()> {
    let mut insert = connection.prepare_cached(
        "insert into paragraph_kinds (text, kind) values (?1, ?2)
          on conflict (text) do update set kind = excluded.kind",
    )?;
    for (text, kind) in judged {
        insert.execute(params![text, kind.as_str()])?;
    }
    Ok(())
}
