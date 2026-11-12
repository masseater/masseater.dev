import { ManuscriptBody, SourceBody, SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

const DocumentKind = SyncDocument.fields.kind;

const Entry = Schema.Struct({ kind: DocumentKind, id: Schema.String, changed_at: Schema.Int });

const ManuscriptRow = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  title_by: Schema.NullOr(Schema.Literals(["writer", "ai"])),
  created_at: Schema.Int,
});

const ParagraphRow = Schema.Struct({ id: Schema.String, text: Schema.String });

const SourceRow = Schema.Struct({
  manuscript_id: Schema.NullOr(Schema.String),
  label: Schema.String,
  origin: SourceBody.fields.origin,
  client: Schema.String,
  created_at: Schema.Int,
});

const FactRow = Schema.Struct({
  kind: Schema.Literals(["character", "voice", "event", "knowledge", "setting", "idea"]),
  subject: Schema.String,
  body: Schema.String,
  at: Schema.NullOr(Schema.String),
});

const encodeManuscript = Schema.encodeEffect(Schema.fromJsonString(ManuscriptBody));
const encodeSource = Schema.encodeEffect(Schema.fromJsonString(SourceBody));

const selectEntries = SqlSchema.findAll({
  Request: Schema.Void,
  Result: Entry,
  execute: () =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select kind, id, changed_at from sync_outbox order by changed_at`,
      ),
    ),
});

const selectManuscript = SqlSchema.findOneOption({
  Request: Schema.String,
  Result: ManuscriptRow,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select title, title_by, created_at from manuscripts where id = ${id}`,
      ),
    ),
});

const selectParagraphs = SqlSchema.findAll({
  Request: Schema.String,
  Result: ParagraphRow,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select id, text from paragraphs where manuscript_id = ${id} order by position`,
      ),
    ),
});

const selectSource = SqlSchema.findOneOption({
  Request: Schema.String,
  Result: SourceRow,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) =>
          sql`select manuscript_id, label, origin, client, created_at from sources where id = ${id}`,
      ),
    ),
});

const selectFacts = SqlSchema.findAll({
  Request: Schema.String,
  Result: FactRow,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select kind, subject, body, at from facts where source_id = ${id} order by id`,
      ),
    ),
});

const manuscriptBody = Effect.fn("manuscriptBody")(function* manuscriptBody(id: string) {
  const found = yield* selectManuscript(id);
  if (Option.isNone(found)) {
    return Option.none<string>();
  }
  const { title, title_by: by, created_at: createdAt } = found.value;
  const paragraphs = yield* selectParagraphs(id);
  const titled = pipe(
    Option.fromNullishOr(title),
    Option.flatMap((text) =>
      pipe(
        Option.fromNullishOr(by),
        Option.map((author) => ({ text, by: author })),
      ),
    ),
  );
  const body = yield* encodeManuscript({
    title: Option.getOrNull(titled),
    createdAt,
    paragraphs,
  });
  return Option.some(body);
});

const sourceBody = Effect.fn("sourceBody")(function* sourceBody(id: string) {
  const found = yield* selectSource(id);
  if (Option.isNone(found)) {
    return Option.none<string>();
  }
  const row = found.value;
  const facts = yield* selectFacts(id);
  const body = yield* encodeSource({
    manuscriptId: row.manuscript_id,
    label: row.label,
    origin: row.origin,
    client: row.client,
    createdAt: row.created_at,
    facts: pipe(
      facts,
      Array.map(({ kind, subject, body: text, at }) => ({ kind, subject, body: text, when: at })),
    ),
  });
  return Option.some(body);
});

interface Pending {
  readonly entry: typeof Entry.Type;
  readonly document: typeof SyncDocument.Type;
}

const documentOf = Effect.fn("documentOf")(function* documentOf(entry: typeof Entry.Type) {
  const body = yield* Effect.suspend(() => {
    if (entry.kind === "manuscript") {
      return manuscriptBody(entry.id);
    }
    return sourceBody(entry.id);
  });
  return {
    entry,
    document: SyncDocument.make({
      kind: entry.kind,
      id: entry.id,
      updatedAt: entry.changed_at,
      deleted: Option.isNone(body),
      body: pipe(
        body,
        Option.getOrElse(() => ""),
      ),
    }),
  };
});

/** @internal */
const pendingDocuments = Effect.fn("pendingDocuments")(function* pendingDocuments() {
  const entries = yield* selectEntries();
  return yield* pipe(
    entries,
    Effect.forEach((entry) => documentOf(entry)),
  );
});

/** @internal */
const markPushed = Effect.fn("markPushed")(function* markPushed(
  entries: readonly (typeof Entry.Type)[],
) {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.forEach(
    entries,
    ({ kind, id, changed_at: changedAt }) =>
      sql`delete from sync_outbox where kind = ${kind} and id = ${id} and changed_at = ${changedAt}`,
    { discard: true },
  );
});

/** @internal */
const pendingCount = Effect.fn("pendingCount")(function* pendingCount() {
  const entries = yield* selectEntries();
  return entries.length;
});

export { markPushed, pendingCount, pendingDocuments };
export type { Pending };
