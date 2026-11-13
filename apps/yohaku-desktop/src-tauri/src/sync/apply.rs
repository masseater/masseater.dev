use rusqlite::{Connection, OptionalExtension, Transaction, params};

use crate::failure::{Failure, Outcome};
use crate::store::manuscripts::insert_paragraphs;
use crate::store::sources::insert_facts;

use super::documents::{DocumentKind, ManuscriptBody, SourceBody, StoredDocument, SyncDocument};

fn pending_since(
    connection: &Connection,
    document: &SyncDocument,
) -> rusqlite::Result<Option<i64>> {
    connection
        .query_row(
            "select changed_at from sync_outbox where kind = ?1 and id = ?2",
            params![document.kind.as_str(), document.id],
            |row| row.get(0),
        )
        .optional()
}

fn apply_manuscript(transaction: &Transaction<'_>, document: &SyncDocument) -> Outcome<()> {
    if document.deleted {
        transaction.execute(
            "delete from manuscripts where id = ?1",
            params![document.id],
        )?;
        return Ok(());
    }
    let body: ManuscriptBody = serde_json::from_str(&document.body)?;
    transaction.execute(
        "insert into manuscripts (id, title, title_by, created_at, updated_at)
          values (?1, ?2, ?3, ?4, ?5)
          on conflict (id) do update set title = excluded.title, title_by = excluded.title_by,
            updated_at = excluded.updated_at",
        params![
            document.id,
            body.title.as_ref().map(|title| title.text.as_str()),
            body.title.as_ref().map(|title| title.by.as_str()),
            body.created_at,
            document.updated_at
        ],
    )?;
    insert_paragraphs(transaction, &document.id, &body.paragraphs)?;
    Ok(())
}

fn apply_source(transaction: &Transaction<'_>, document: &SyncDocument) -> Outcome<()> {
    transaction.execute("delete from sources where id = ?1", params![document.id])?;
    if document.deleted {
        return Ok(());
    }
    let body: SourceBody = serde_json::from_str(&document.body)?;
    transaction.execute(
        "insert into sources (id, manuscript_id, label, origin, client, created_at)
          values (?1, (select id from manuscripts where id = ?2), ?3, ?4, ?5, ?6)",
        params![
            document.id,
            body.manuscript_id,
            body.label,
            body.origin.as_str(),
            body.client,
            body.created_at
        ],
    )?;
    insert_facts(transaction, &document.id, &body.facts)?;
    Ok(())
}

fn apply_one(transaction: &Transaction<'_>, document: &SyncDocument) -> Outcome<()> {
    let newer_here = pending_since(transaction, document)?
        .is_some_and(|changed_at| changed_at >= document.updated_at);
    if newer_here {
        return Ok(());
    }
    match document.kind {
        DocumentKind::Manuscript => apply_manuscript(transaction, document),
        DocumentKind::Source => apply_source(transaction, document),
    }
}

pub fn apply_remote(connection: &mut Connection, documents: &[StoredDocument]) -> Outcome<()> {
    let transaction = connection.transaction()?;
    transaction.execute("insert into sync_applying (flag) values (1)", [])?;
    let ordered = documents
        .iter()
        .filter(|stored| stored.document.kind == DocumentKind::Manuscript)
        .chain(
            documents
                .iter()
                .filter(|stored| stored.document.kind == DocumentKind::Source),
        );
    for stored in ordered {
        apply_one(&transaction, &stored.document)?;
    }
    transaction.execute("delete from sync_applying", [])?;
    transaction.commit().map_err(Failure::from)
}

#[cfg(test)]
mod tests {
    use crate::model::Paragraph;
    use crate::store::{Store, manuscripts};
    use crate::sync::documents::{DocumentKind, ManuscriptBody, StoredDocument, SyncDocument};
    use crate::sync::outbox::{mark_pushed, pending_count, pending_documents};

    fn remote_manuscript(id: &str, text: &str, updated_at: i64) -> StoredDocument {
        let body = ManuscriptBody {
            title: None,
            created_at: 1,
            paragraphs: vec![Paragraph {
                id: "p".into(),
                text: text.into(),
            }],
        };
        StoredDocument {
            document: SyncDocument {
                kind: DocumentKind::Manuscript,
                id: id.into(),
                updated_at,
                deleted: false,
                body: serde_json::to_string(&body).expect("body"),
            },
            revision: 1,
        }
    }

    #[test]
    fn a_saved_manuscript_waits_in_the_outbox_until_pushed() {
        let store = Store::in_memory().expect("store");
        let created = store.with(|c| manuscripts::create(c)).expect("create");
        let paragraphs = [Paragraph {
            id: "p".into(),
            text: "雨".into(),
        }];
        store
            .with(|c| manuscripts::save(c, &created.id, &paragraphs))
            .expect("save");
        let pending = store.with(|c| pending_documents(c)).expect("pending");
        assert_eq!(pending.len(), 1);
        let body: ManuscriptBody = serde_json::from_str(&pending[0].document.body).expect("body");
        assert_eq!(body.paragraphs, paragraphs);
        let entries: Vec<_> = pending.into_iter().map(|p| p.entry).collect();
        store.with(|c| mark_pushed(c, &entries)).expect("mark");
        assert_eq!(store.with(|c| pending_count(c)).expect("count"), 0);
    }

    #[test]
    fn applying_a_remote_change_does_not_echo_back() {
        let store = Store::in_memory().expect("store");
        store
            .try_with(|c| super::apply_remote(c, &[remote_manuscript("m", "雪", 5)]))
            .expect("apply");
        assert_eq!(store.with(|c| pending_count(c)).expect("count"), 0);
        let paragraphs = store
            .with(|c| manuscripts::paragraphs(c, "m"))
            .expect("paragraphs");
        assert_eq!(paragraphs[0].text, "雪");
    }

    #[test]
    fn deleting_a_manuscript_sends_a_deletion() {
        let store = Store::in_memory().expect("store");
        store
            .try_with(|c| super::apply_remote(c, &[remote_manuscript("m", "雪", 5)]))
            .expect("apply");
        store
            .with(|c| c.execute("delete from manuscripts where id = 'm'", []))
            .expect("delete");
        let pending = store.with(|c| pending_documents(c)).expect("pending");
        assert_eq!(pending.len(), 1);
        assert!(pending[0].document.deleted);
    }
}
