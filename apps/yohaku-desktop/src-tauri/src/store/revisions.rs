use rusqlite::{Connection, OptionalExtension, params};

use super::manuscripts::{insert_paragraphs, paragraphs};
use super::{fresh_id, now};
use crate::model::Revision;
use crate::protocol::Paragraph;

const KEEP_EVERY: i64 = 10 * 60 * 1000;
const EXCERPT_LENGTH: usize = 60;

#[derive(Clone, Copy)]
pub enum Keep {
    Periodically,
    Always,
}

fn encoded(paragraphs: &[Paragraph]) -> rusqlite::Result<String> {
    serde_json::to_string(paragraphs)
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))
}

fn decoded(body: &str) -> rusqlite::Result<Vec<Paragraph>> {
    serde_json::from_str(body).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(error))
    })
}

fn latest(connection: &Connection, id: &str) -> rusqlite::Result<Option<(i64, String)>> {
    connection
        .query_row(
            "select created_at, paragraphs from revisions where manuscript_id = ?1
              order by created_at desc limit 1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
}

pub fn keep(connection: &Connection, id: &str, at: i64, keep: Keep) -> rusqlite::Result<()> {
    let current = paragraphs(connection, id)?;
    if current
        .iter()
        .all(|paragraph| paragraph.text.trim().is_empty())
    {
        return Ok(());
    }
    let body = encoded(&current)?;
    let previous = latest(connection, id)?;
    let recent = previous
        .as_ref()
        .is_some_and(|(kept_at, _)| at - kept_at < KEEP_EVERY);
    let unchanged = previous.as_ref().is_some_and(|(_, kept)| *kept == body);
    if unchanged || (recent && matches!(keep, Keep::Periodically)) {
        return Ok(());
    }
    connection.execute(
        "insert into revisions (id, manuscript_id, created_at, paragraphs) values (?1, ?2, ?3, ?4)",
        params![fresh_id(), id, at, body],
    )?;
    Ok(())
}

fn revision_of(id: String, saved_at: i64, body: &str) -> rusqlite::Result<Revision> {
    let kept = decoded(body)?;
    let excerpt = kept
        .iter()
        .map(|paragraph| paragraph.text.trim())
        .find(|text| !text.is_empty())
        .unwrap_or_default()
        .chars()
        .take(EXCERPT_LENGTH)
        .collect();
    let characters = kept
        .iter()
        .map(|paragraph| paragraph.text.chars().count())
        .sum::<usize>();
    Ok(Revision {
        id,
        saved_at,
        excerpt,
        characters: u32::try_from(characters).unwrap_or(u32::MAX),
    })
}

pub fn list(connection: &Connection, id: &str) -> rusqlite::Result<Vec<Revision>> {
    let rows = connection
        .prepare_cached(
            "select id, created_at, paragraphs from revisions where manuscript_id = ?1
              order by created_at desc",
        )?
        .query_map(params![id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    rows.into_iter()
        .map(|(revision, saved_at, body)| revision_of(revision, saved_at, &body))
        .collect()
}

pub fn restore(connection: &mut Connection, id: &str, revision: &str) -> rusqlite::Result<bool> {
    let transaction = connection.transaction()?;
    let body: Option<String> = transaction
        .query_row(
            "select paragraphs from revisions where id = ?1 and manuscript_id = ?2",
            params![revision, id],
            |row| row.get(0),
        )
        .optional()?;
    let Some(body) = body else {
        return Ok(false);
    };
    let at = now();
    keep(&transaction, id, at, Keep::Always)?;
    insert_paragraphs(&transaction, id, &decoded(&body)?)?;
    transaction.execute(
        "update manuscripts set updated_at = ?1 where id = ?2",
        params![at, id],
    )?;
    transaction.commit()?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::{KEEP_EVERY, Keep, keep, list, restore};
    use crate::protocol::Paragraph;
    use crate::store::{Store, manuscripts};

    fn written(text: &str) -> Vec<Paragraph> {
        vec![Paragraph {
            id: "p".to_owned(),
            text: text.to_owned(),
        }]
    }

    #[test]
    fn keeps_at_most_one_revision_per_interval_and_restores_it() {
        let store = Store::in_memory().expect("store");
        store
            .with(|connection| {
                let id = manuscripts::create(connection)?.id;
                manuscripts::insert_paragraphs(connection, &id, &written("一稿"))?;
                keep(connection, &id, 0, Keep::Periodically)?;
                manuscripts::insert_paragraphs(connection, &id, &written("二稿"))?;
                keep(connection, &id, 1, Keep::Periodically)?;
                assert_eq!(list(connection, &id)?.len(), 1);
                keep(connection, &id, KEEP_EVERY, Keep::Periodically)?;
                keep(connection, &id, KEEP_EVERY * 3, Keep::Periodically)?;
                let kept = list(connection, &id)?;
                assert_eq!(
                    kept.iter()
                        .map(|revision| revision.excerpt.as_str())
                        .collect::<Vec<_>>(),
                    ["二稿", "一稿"]
                );
                let first = kept[1].id.clone();
                assert!(restore(connection, &id, &first)?);
                assert_eq!(manuscripts::paragraphs(connection, &id)?, written("一稿"));
                Ok(())
            })
            .expect("revisions");
    }
}
