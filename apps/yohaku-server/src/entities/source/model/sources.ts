import { Fact, Source, SourceOrigin } from "@masseater.dev/yohaku-protocol";
import { Array, Clock, Effect, Option, Schema, pipe } from "effect";
import { SecureRandom } from "effect/crypto";
import { SqlClient, SqlSchema } from "effect/sql";

const NO_MANUSCRIPT = Option.getOrNull(Option.none<string>());
const MANUSCRIPT_ORIGIN: typeof SourceOrigin.Type = "manuscript";

const SourceRow = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  origin: SourceOrigin,
  client: Schema.String,
  facts: Schema.Int,
  created_at: Schema.Int,
});

const FactRow = Schema.Struct({
  kind: Fact.fields.kind,
  subject: Schema.String,
  body: Schema.String,
  at: Schema.NullOr(Schema.String),
  label: Schema.String,
});

const selectSources = SqlSchema.findAll({
  Request: Schema.Void,
  Result: SourceRow,
  execute: () =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select s.id, s.label, s.origin, s.client, s.created_at,
          (select count(*) from facts f where f.source_id = s.id) as facts
          from sources s order by s.created_at desc`,
      ),
    ),
});

const selectFacts = SqlSchema.findAll({
  Request: Schema.Void,
  Result: FactRow,
  execute: () =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select f.kind, f.subject, f.body, f.at, s.label
          from facts f join sources s on s.id = f.source_id order by s.created_at, f.id`,
      ),
    ),
});

const sourceOf = (row: typeof SourceRow.Type): typeof Source.Type =>
  Source.make({
    id: row.id,
    label: row.label,
    origin: row.origin,
    client: row.client,
    facts: row.facts,
    createdAt: row.created_at,
  });

/** @internal */
const listSources = Effect.fn("listSources")(function* listSources() {
  const rows = yield* selectSources();
  return pipe(rows, Array.map(sourceOf));
});

/** @internal */
const listFacts = Effect.fn("listFacts")(function* listFacts() {
  return yield* selectFacts();
});

const insertSource = Effect.fn("insertSource")(function* insertSource(
  source: Readonly<{
    label: string;
    origin: typeof SourceOrigin.Type;
    client: string;
    manuscriptId: string | null;
    facts: readonly (typeof Fact.Type)[];
  }>,
) {
  const sql = yield* SqlClient.SqlClient;
  const random = yield* SecureRandom.SecureRandom;
  const now = yield* Clock.currentTimeMillis;
  const id = yield* random.uuidV7();
  yield* sql`insert into sources (id, manuscript_id, label, origin, client, created_at)
    values (${id}, ${source.manuscriptId}, ${source.label}, ${source.origin}, ${source.client}, ${now})`;
  yield* Effect.forEach(
    source.facts,
    (fact) =>
      sql`insert into facts (source_id, kind, subject, body, at)
        values (${id}, ${fact.kind}, ${fact.subject}, ${fact.body}, ${fact.when})`,
    { discard: true },
  );
  return Source.make({
    id,
    label: source.label,
    origin: source.origin,
    client: source.client,
    facts: source.facts.length,
    createdAt: now,
  });
});

/** @internal */
const addSource = Effect.fn("addSource")(function* addSource(
  source: Readonly<{
    label: string;
    origin: typeof SourceOrigin.Type;
    client: string;
    manuscriptId: string | null;
    facts: readonly (typeof Fact.Type)[];
  }>,
) {
  const sql = yield* SqlClient.SqlClient;
  return yield* sql.withTransaction(insertSource(source));
});

/** @internal */
const revertSource = Effect.fn("revertSource")(function* revertSource(id: string) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`delete from sources where id = ${id}`;
});

/** @internal */
const replaceManuscriptSource = Effect.fn("replaceManuscriptSource")(function* replace(
  source: Readonly<{
    label: string;
    origin: typeof SourceOrigin.Type;
    client: string;
    manuscriptId: string | null;
    facts: readonly (typeof Fact.Type)[];
  }>,
) {
  const sql = yield* SqlClient.SqlClient;
  const swap = Effect.gen(function* swap() {
    yield* sql`delete from sources
      where manuscript_id = ${source.manuscriptId} and origin = ${MANUSCRIPT_ORIGIN}`;
    return yield* insertSource(source);
  });
  return yield* sql.withTransaction(swap);
});

export { NO_MANUSCRIPT, addSource, listFacts, listSources, replaceManuscriptSource, revertSource };
