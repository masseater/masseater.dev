use rusqlite::{Connection, Row, params};

use crate::model::{Manuscript, Paragraph, Title, TitleAuthor};
use crate::text::utf16_slice;

use super::{fresh_id, now};

const EXCERPT_LENGTH: usize = 80;

const SELECT_MANUSCRIPTS: &str = "select m.id, m.title, m.title_by, m.updated_at,
  (select p.text from paragraphs p where p.manuscript_id = m.id and p.text != ''
    order by p.position limit 1) as excerpt
  from manuscripts m where ?1 is null or m.id = ?1 order by m.updated_at desc";

pub fn title_of(text: Option<String>, by: Option<&str>) -> Option<Title> {
    Some(Title {
        text: text?,
        by: TitleAuthor::parse(by?)?,
    })
}

fn manuscript_of(row: &Row<'_>) -> rusqlite::Result<Manuscript> {
    let by: Option<String> = row.get(2)?;
    let excerpt: Option<String> = row.get(4)?;
    Ok(Manuscript {
        id: row.get(0)?,
        title: title_of(row.get(1)?, by.as_deref()),
        excerpt: utf16_slice(&excerpt.unwrap_or_default(), 0, EXCERPT_LENGTH),
        updated_at: row.get(3)?,
    })
}

fn select(connection: &Connection, id: Option<&str>) -> rusqlite::Result<Vec<Manuscript>> {
    connection
        .prepare_cached(SELECT_MANUSCRIPTS)?
        .query_map(params![id], manuscript_of)?
        .collect()
}

pub fn list(connection: &Connection) -> rusqlite::Result<Vec<Manuscript>> {
    select(connection, None)
}

pub fn find(connection: &Connection, id: &str) -> rusqlite::Result<Option<Manuscript>> {
    Ok(select(connection, Some(id))?.into_iter().next())
}

pub fn paragraphs(connection: &Connection, id: &str) -> rusqlite::Result<Vec<Paragraph>> {
    connection
        .prepare_cached(
            "select id, text from paragraphs where manuscript_id = ?1 order by position",
        )?
        .query_map(params![id], |row| {
            Ok(Paragraph {
                id: row.get(0)?,
                text: row.get(1)?,
            })
        })?
        .collect()
}

pub fn create(connection: &Connection) -> rusqlite::Result<Manuscript> {
    let id = fresh_id();
    let at = now();
    connection.execute(
        "insert into manuscripts (id, title, title_by, created_at, updated_at)
          values (?1, null, null, ?2, ?2)",
        params![id, at],
    )?;
    Ok(Manuscript {
        id,
        title: None,
        excerpt: String::new(),
        updated_at: at,
    })
}

pub fn insert_paragraphs(
    connection: &Connection,
    id: &str,
    paragraphs: &[Paragraph],
) -> rusqlite::Result<()> {
    connection.execute(
        "delete from paragraphs where manuscript_id = ?1",
        params![id],
    )?;
    let mut insert = connection.prepare_cached(
        "insert into paragraphs (manuscript_id, id, position, text) values (?1, ?2, ?3, ?4)",
    )?;
    for (position, paragraph) in paragraphs.iter().enumerate() {
        insert.execute(params![
            id,
            paragraph.id,
            i64::try_from(position).unwrap_or(i64::MAX),
            paragraph.text
        ])?;
    }
    Ok(())
}

pub fn save(
    connection: &mut Connection,
    id: &str,
    paragraphs: &[Paragraph],
) -> rusqlite::Result<()> {
    let transaction = connection.transaction()?;
    insert_paragraphs(&transaction, id, paragraphs)?;
    transaction.execute(
        "update manuscripts set updated_at = ?1 where id = ?2",
        params![now(), id],
    )?;
    transaction.commit()
}

pub fn set_title(connection: &Connection, id: &str, title: Option<&Title>) -> rusqlite::Result<()> {
    connection.execute(
        "update manuscripts set title = ?1, title_by = ?2 where id = ?3",
        params![
            title.map(|title| title.text.as_str()),
            title.map(|title| title.by.as_str()),
            id
        ],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::model::{Paragraph, Title, TitleAuthor};
    use crate::store::Store;

    #[test]
    fn saves_paragraphs_and_lists_the_first_written_one_as_excerpt() {
        let store = Store::in_memory().expect("store");
        let created = store
            .with(|connection| super::create(connection))
            .expect("create");
        let paragraphs = vec![
            Paragraph {
                id: "a".into(),
                text: String::new(),
            },
            Paragraph {
                id: "b".into(),
                text: "雨が降っていた。".into(),
            },
        ];
        store
            .with(|connection| super::save(connection, &created.id, &paragraphs))
            .expect("save");
        let title = Title {
            text: "雨".into(),
            by: TitleAuthor::Writer,
        };
        store
            .with(|connection| super::set_title(connection, &created.id, Some(&title)))
            .expect("title");
        let listed = store
            .with(|connection| super::list(connection))
            .expect("list");
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].excerpt, "雨が降っていた。");
        assert_eq!(listed[0].title, Some(title));
        let read = store
            .with(|connection| super::paragraphs(connection, &created.id))
            .expect("read");
        assert_eq!(read, paragraphs);
    }
}
