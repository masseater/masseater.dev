import { ManuscriptBody, SourceBody } from "@masseater.dev/yohaku-protocol/sync";
import type { StoredDocument } from "@masseater.dev/yohaku-protocol/sync";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

type Stored = typeof StoredDocument.Type;

const NO_TEXT = Option.getOrNull(Option.none<string>());

const decodeManuscript = Schema.decodeEffect(Schema.fromJsonString(ManuscriptBody));
const decodeSource = Schema.decodeEffect(Schema.fromJsonString(SourceBody));

const selectPending = SqlSchema.findOneOption({
  Request: Schema.Struct({ kind: Schema.String, id: Schema.String }),
  Result: Schema.Struct({ changed_at: Schema.Int }),
  execute: ({ kind, id }) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select changed_at from sync_outbox where kind = ${kind} and id = ${id}`,
      ),
    ),
});

const applyManuscript = Effect.fn("applyManuscript")(function* applyManuscript(document: Stored) {
  const sql = yield* SqlClient.SqlClient;
  if (document.deleted) {
    yield* sql`delete from manuscripts where id = ${document.id}`;
    return;
  }
  const body = yield* decodeManuscript(document.body);
  const title = pipe(
    Option.fromNullishOr(body.title),
    Option.map(({ text }) => text),
    Option.getOrElse(() => NO_TEXT),
  );
  const by = pipe(
    Option.fromNullishOr(body.title),
    Option.map(({ by: author }) => author),
    Option.getOrElse(() => NO_TEXT),
  );
  yield* sql`insert into manuscripts (id, title, title_by, created_at, updated_at)
    values (${document.id}, ${title}, ${by}, ${body.createdAt}, ${document.updatedAt})
    on conflict (id) do update set title = excluded.title, title_by = excluded.title_by,
      updated_at = excluded.updated_at`;
  yield* sql`delete from paragraphs where manuscript_id = ${document.id}`;
  yield* Effect.forEach(
    body.paragraphs,
    (paragraph, position) =>
      sql`insert into paragraphs (manuscript_id, id, position, text)
        values (${document.id}, ${paragraph.id}, ${position}, ${paragraph.text})`,
    { discard: true },
  );
});

const applySource = Effect.fn("applySource")(function* applySource(document: Stored) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`delete from sources where id = ${document.id}`;
  if (document.deleted) {
    return;
  }
  const body = yield* decodeSource(document.body);
  yield* sql`insert into sources (id, manuscript_id, label, origin, client, created_at)
    values (${document.id}, (select id from manuscripts where id = ${body.manuscriptId}),
      ${body.label}, ${body.origin}, ${body.client}, ${body.createdAt})`;
  yield* Effect.forEach(
    body.facts,
    (fact) =>
      sql`insert into facts (source_id, kind, subject, body, at)
        values (${document.id}, ${fact.kind}, ${fact.subject}, ${fact.body}, ${fact.when})`,
    { discard: true },
  );
});

const applyOne = Effect.fn("applyOne")(function* applyOne(document: Stored) {
  const pending = yield* selectPending({ kind: document.kind, id: document.id });
  if (Option.exists(pending, ({ changed_at: changedAt }) => changedAt >= document.updatedAt)) {
    return;
  }
  if (document.kind === "manuscript") {
    yield* applyManuscript(document);
    return;
  }
  yield* applySource(document);
});

/** @internal */
const applyRemote = Effect.fn("applyRemote")(function* applyRemote(documents: readonly Stored[]) {
  const sql = yield* SqlClient.SqlClient;
  const applying = Effect.gen(function* applying() {
    yield* sql`insert into sync_applying (flag) values (1)`;
    const manuscripts = pipe(
      documents,
      Array.filter(({ kind }) => kind === "manuscript"),
    );
    const sources = pipe(
      documents,
      Array.filter(({ kind }) => kind === "source"),
    );
    yield* Effect.forEach([...manuscripts, ...sources], applyOne, { discard: true });
    yield* sql`delete from sync_applying`;
  });
  yield* sql.withTransaction(applying);
});

export { applyRemote };
