use rusqlite::{Connection, OptionalExtension, params};

use crate::model::SourceOrigin;
use crate::store::manuscripts::{paragraphs, title_of};
use crate::store::sources::fact_of;

use super::documents::{DocumentKind, ManuscriptBody, SourceBody, SyncDocument};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    pub kind: DocumentKind,
    pub id: String,
    pub changed_at: i64,
}

pub struct Pending {
    pub entry: Entry,
    pub document: SyncDocument,
}

fn entries(connection: &Connection) -> rusqlite::Result<Vec<Entry>> {
    connection
        .prepare_cached("select kind, id, changed_at from sync_outbox order by changed_at")?
        .query_map([], |row| {
            let kind: String = row.get(0)?;
            Ok((kind, row.get(1)?, row.get(2)?))
        })?
        .filter_map(|row| {
            row.map(|(kind, id, changed_at)| {
                DocumentKind::parse(&kind).map(|kind| Entry {
                    kind,
                    id,
                    changed_at,
                })
            })
            .transpose()
        })
        .collect()
}

fn manuscript_body(connection: &Connection, id: &str) -> rusqlite::Result<Option<String>> {
    let found = connection
        .query_row(
            "select title, title_by, created_at from manuscripts where id = ?1",
            params![id],
            |row| {
                let title: Option<String> = row.get(0)?;
                let by: Option<String> = row.get(1)?;
                Ok((title, by, row.get::<_, i64>(2)?))
            },
        )
        .optional()?;
    let Some((title, by, created_at)) = found else {
        return Ok(None);
    };
    let body = ManuscriptBody {
        title: title_of(title, by.as_deref()),
        created_at,
        paragraphs: paragraphs(connection, id)?,
    };
    Ok(serde_json::to_string(&body).ok())
}

fn source_body(connection: &Connection, id: &str) -> rusqlite::Result<Option<String>> {
    let found = connection
        .query_row(
            "select manuscript_id, label, origin, client, created_at from sources where id = ?1",
            params![id],
            |row| {
                let origin: String = row.get(2)?;
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, String>(1)?,
                    origin,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            },
        )
        .optional()?;
    let Some((manuscript_id, label, origin, client, created_at)) = found else {
        return Ok(None);
    };
    let facts = connection
        .prepare_cached(
            "select kind, subject, body, at from facts where source_id = ?1 order by id",
        )?
        .query_map(params![id], |row| {
            let kind: String = row.get(0)?;
            Ok(fact_of(&kind, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .filter_map(Result::transpose)
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let body = SourceBody {
        manuscript_id,
        label,
        origin: SourceOrigin::parse(&origin).unwrap_or(SourceOrigin::Agent),
        client,
        created_at,
        facts,
    };
    Ok(serde_json::to_string(&body).ok())
}

fn document_of(connection: &Connection, entry: Entry) -> rusqlite::Result<Pending> {
    let body = match entry.kind {
        DocumentKind::Manuscript => manuscript_body(connection, &entry.id)?,
        DocumentKind::Source => source_body(connection, &entry.id)?,
    };
    let document = SyncDocument {
        kind: entry.kind,
        id: entry.id.clone(),
        updated_at: entry.changed_at,
        deleted: body.is_none(),
        body: body.unwrap_or_default(),
    };
    Ok(Pending { entry, document })
}

pub fn pending_documents(connection: &Connection) -> rusqlite::Result<Vec<Pending>> {
    entries(connection)?
        .into_iter()
        .map(|entry| document_of(connection, entry))
        .collect()
}

pub fn mark_pushed(connection: &Connection, pushed: &[Entry]) -> rusqlite::Result<()> {
    let mut delete = connection.prepare_cached(
        "delete from sync_outbox where kind = ?1 and id = ?2 and changed_at = ?3",
    )?;
    for entry in pushed {
        delete.execute(params![entry.kind.as_str(), entry.id, entry.changed_at])?;
    }
    Ok(())
}

pub fn pending_count(connection: &Connection) -> rusqlite::Result<u32> {
    connection.query_row("select count(*) from sync_outbox", [], |row| row.get(0))
}
