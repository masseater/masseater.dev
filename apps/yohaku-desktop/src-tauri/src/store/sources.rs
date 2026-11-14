use rusqlite::{Connection, Transaction, params};
use serde::Serialize;

use crate::model::{Fact, FactKind, Source, SourceOrigin};

use super::{fresh_id, now};

pub struct NewSource<'a> {
    pub label: &'a str,
    pub origin: SourceOrigin,
    pub client: &'a str,
    pub manuscript_id: Option<&'a str>,
    pub facts: &'a [Fact],
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KnownFact {
    pub kind: String,
    pub subject: String,
    pub body: String,
    pub at: Option<String>,
    pub label: String,
}

pub fn list(connection: &Connection) -> rusqlite::Result<Vec<Source>> {
    connection
        .prepare_cached(
            "select s.id, s.label, s.origin, s.client, s.created_at,
              (select count(*) from facts f where f.source_id = s.id) as facts
              from sources s order by s.created_at desc",
        )?
        .query_map([], |row| {
            let origin: String = row.get(2)?;
            Ok(Source {
                id: row.get(0)?,
                label: row.get(1)?,
                origin: SourceOrigin::parse(&origin).unwrap_or(SourceOrigin::Agent),
                client: row.get(3)?,
                created_at: row.get(4)?,
                facts: row.get(5)?,
            })
        })?
        .collect()
}

pub fn facts(connection: &Connection) -> rusqlite::Result<Vec<KnownFact>> {
    connection
        .prepare_cached(
            "select f.kind, f.subject, f.body, f.at, s.label
              from facts f join sources s on s.id = f.source_id order by s.created_at, f.id",
        )?
        .query_map([], |row| {
            Ok(KnownFact {
                kind: row.get(0)?,
                subject: row.get(1)?,
                body: row.get(2)?,
                at: row.get(3)?,
                label: row.get(4)?,
            })
        })?
        .collect()
}

pub fn insert_facts(
    connection: &Connection,
    source_id: &str,
    facts: &[Fact],
) -> rusqlite::Result<()> {
    let mut insert = connection.prepare_cached(
        "insert into facts (source_id, kind, subject, body, at) values (?1, ?2, ?3, ?4, ?5)",
    )?;
    for fact in facts {
        insert.execute(params![
            source_id,
            fact.kind.as_str(),
            fact.subject,
            fact.body,
            fact.when
        ])?;
    }
    Ok(())
}

fn insert(transaction: &Transaction<'_>, source: &NewSource<'_>) -> rusqlite::Result<Source> {
    let id = fresh_id();
    let at = now();
    transaction.execute(
        "insert into sources (id, manuscript_id, label, origin, client, created_at)
          values (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            source.manuscript_id,
            source.label,
            source.origin.as_str(),
            source.client,
            at
        ],
    )?;
    insert_facts(transaction, &id, source.facts)?;
    Ok(Source {
        id,
        label: source.label.to_owned(),
        origin: source.origin,
        client: source.client.to_owned(),
        facts: u32::try_from(source.facts.len()).unwrap_or(u32::MAX),
        created_at: at,
    })
}

pub fn add(connection: &mut Connection, source: &NewSource<'_>) -> rusqlite::Result<Source> {
    let transaction = connection.transaction()?;
    let added = insert(&transaction, source)?;
    transaction.commit()?;
    Ok(added)
}

pub fn replace_manuscript_source(
    connection: &mut Connection,
    source: &NewSource<'_>,
) -> rusqlite::Result<Source> {
    let transaction = connection.transaction()?;
    transaction.execute(
        "delete from sources where manuscript_id = ?1 and origin = ?2",
        params![source.manuscript_id, SourceOrigin::Manuscript.as_str()],
    )?;
    let added = insert(&transaction, source)?;
    transaction.commit()?;
    Ok(added)
}

pub fn revert(connection: &Connection, id: &str) -> rusqlite::Result<()> {
    connection.execute("delete from sources where id = ?1", params![id])?;
    Ok(())
}

pub fn facts_of(connection: &Connection, source_id: &str) -> rusqlite::Result<Vec<Fact>> {
    connection
        .prepare_cached(
            "select kind, subject, body, at from facts where source_id = ?1 order by id",
        )?
        .query_map(params![source_id], |row| {
            let kind: String = row.get(0)?;
            Ok(fact_of(&kind, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .filter_map(Result::transpose)
        .collect()
}

pub fn fact_of(kind: &str, subject: String, body: String, when: Option<String>) -> Option<Fact> {
    Some(Fact {
        kind: FactKind::parse(kind)?,
        subject,
        body,
        when,
    })
}
