use rusqlite::{Connection, Transaction, params};

const LEDGER: &str = "create table if not exists effect_sql_migrations (
  migration_id integer primary key not null,
  created_at datetime not null default current_timestamp,
  name varchar(255) not null
)";

const INIT: &str = "
create table manuscripts (
  id text primary key,
  title text,
  title_by text,
  created_at integer not null,
  updated_at integer not null
);
create table paragraphs (
  manuscript_id text not null references manuscripts(id) on delete cascade,
  id text not null,
  position integer not null,
  text text not null,
  primary key (manuscript_id, id)
);
create table paragraph_kinds (
  text text primary key,
  kind text not null
);
create table dismissals (
  text text not null,
  rule text not null,
  primary key (text, rule)
);
create table sources (
  id text primary key,
  manuscript_id text references manuscripts(id) on delete cascade,
  label text not null,
  origin text not null,
  client text not null,
  created_at integer not null
);
create table facts (
  id integer primary key,
  source_id text not null references sources(id) on delete cascade,
  kind text not null,
  subject text not null,
  body text not null,
  at text
);
create index facts_source on facts(source_id);
create table reactions (
  id integer primary key,
  reaction text not null,
  at integer not null
);
";

const SYNC_TABLES: &str = "
create table sync_outbox (
  kind text not null,
  id text not null,
  changed_at integer not null,
  primary key (kind, id)
);
create table sync_state (key text primary key, value text not null);
create table sync_applying (flag integer primary key);
";

const SYNC_BACKFILL: &str = "
insert into sync_outbox (kind, id, changed_at)
  select 'manuscript', id, updated_at from manuscripts;
insert into sync_outbox (kind, id, changed_at)
  select 'source', id, created_at from sources where origin != 'manuscript';
";

const NOT_APPLYING: &str = "not exists (select 1 from sync_applying)";

struct Trigger {
    table: &'static str,
    event: &'static str,
    condition: String,
    kind: &'static str,
    id: &'static str,
}

fn kept_source(row: &str) -> String {
    format!("exists (select 1 from sources where id = {row}.source_id and origin != 'manuscript')")
}

fn triggers() -> Vec<Trigger> {
    let plain = |table, event, id| Trigger {
        table,
        event,
        condition: NOT_APPLYING.to_owned(),
        kind: "manuscript",
        id,
    };
    let source = |table, event, id, condition: String| Trigger {
        table,
        event,
        condition: format!("{NOT_APPLYING} and {condition}"),
        kind: "source",
        id,
    };
    vec![
        plain("manuscripts", "insert", "new.id"),
        plain("manuscripts", "update", "new.id"),
        plain("manuscripts", "delete", "old.id"),
        plain("paragraphs", "insert", "new.manuscript_id"),
        plain("paragraphs", "update", "new.manuscript_id"),
        plain("paragraphs", "delete", "old.manuscript_id"),
        source(
            "sources",
            "insert",
            "new.id",
            "new.origin != 'manuscript'".to_owned(),
        ),
        source(
            "sources",
            "delete",
            "old.id",
            "old.origin != 'manuscript'".to_owned(),
        ),
        source("facts", "insert", "new.source_id", kept_source("new")),
        source("facts", "delete", "old.source_id", kept_source("old")),
    ]
}

fn trigger_sql(trigger: &Trigger) -> String {
    let Trigger {
        table,
        event,
        condition,
        kind,
        id,
    } = trigger;
    format!(
        "create trigger sync_{table}_{event} after {event} on {table} for each row
  when {condition} begin
  insert into sync_outbox (kind, id, changed_at)
    values ('{kind}', {id}, cast(unixepoch('subsec') * 1000 as integer))
    on conflict (kind, id) do update set changed_at = excluded.changed_at;
  end;"
    )
}

fn init(transaction: &Transaction<'_>) -> rusqlite::Result<()> {
    transaction.execute_batch(INIT)
}

fn sync(transaction: &Transaction<'_>) -> rusqlite::Result<()> {
    transaction.execute_batch(SYNC_TABLES)?;
    for trigger in triggers() {
        transaction.execute_batch(&trigger_sql(&trigger))?;
    }
    transaction.execute_batch(SYNC_BACKFILL)
}

type Step = fn(&Transaction<'_>) -> rusqlite::Result<()>;

fn onboarding(transaction: &Transaction<'_>) -> rusqlite::Result<()> {
    transaction
        .execute_batch("create table onboarding (step text primary key, done_at integer not null)")
}

const MIGRATIONS: [(i64, &str, Step); 3] = [
    (1, "init", init),
    (2, "sync", sync),
    (3, "onboarding", onboarding),
];

fn applied(connection: &Connection) -> rusqlite::Result<i64> {
    connection.query_row(
        "select coalesce(max(migration_id), 0) from effect_sql_migrations",
        [],
        |row| row.get(0),
    )
}

pub fn migrate(connection: &mut Connection) -> rusqlite::Result<()> {
    connection.execute_batch(LEDGER)?;
    let done = applied(connection)?;
    for (id, name, step) in MIGRATIONS.iter().filter(|(id, _, _)| *id > done) {
        let transaction = connection.transaction()?;
        step(&transaction)?;
        transaction.execute(
            "insert into effect_sql_migrations (migration_id, name) values (?1, ?2)",
            params![id, name],
        )?;
        transaction.commit()?;
    }
    Ok(())
}
