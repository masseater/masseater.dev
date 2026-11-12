import { Manuscript, ManuscriptId, Paragraph } from "@masseater.dev/yohaku-protocol";
import type { Title } from "@masseater.dev/yohaku-protocol";
import { Array, Clock, Effect, Option, Schema, String, pipe } from "effect";
import { SecureRandom } from "effect/crypto";
import { SqlClient, SqlSchema } from "effect/sql";

const EXCERPT_START = 0;
const EXCERPT_END = 80;
const NO_TEXT = Option.getOrNull(Option.none<string>());
const UNTITLED = Option.getOrNull(Option.none<typeof Title.Type>());

const ManuscriptRow = Schema.Struct({
  id: ManuscriptId,
  title: Schema.NullOr(Schema.String),
  title_by: Schema.NullOr(Schema.Literals(["writer", "ai"])),
  updated_at: Schema.Int,
  excerpt: Schema.NullOr(Schema.String),
});

const titleOf = (row: typeof ManuscriptRow.Type): typeof Title.Type | null =>
  pipe(
    Option.all({ text: Option.fromNullOr(row.title), by: Option.fromNullOr(row.title_by) }),
    Option.getOrNull,
  );

const manuscriptOf = (row: typeof ManuscriptRow.Type): typeof Manuscript.Type =>
  Manuscript.make({
    id: row.id,
    title: titleOf(row),
    excerpt: pipe(
      Option.fromNullOr(row.excerpt),
      Option.getOrElse(() => String.empty),
      String.slice(EXCERPT_START, EXCERPT_END),
    ),
    updatedAt: row.updated_at,
  });

const selectManuscripts = SqlSchema.findAll({
  Request: Schema.NullOr(ManuscriptId),
  Result: ManuscriptRow,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select m.id, m.title, m.title_by, m.updated_at,
          (select p.text from paragraphs p where p.manuscript_id = m.id and p.text != ''
            order by p.position limit 1) as excerpt
          from manuscripts m where ${id} is null or m.id = ${id} order by m.updated_at desc`,
      ),
    ),
});

const selectParagraphs = SqlSchema.findAll({
  Request: ManuscriptId,
  Result: Paragraph,
  execute: (id) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select id, text from paragraphs where manuscript_id = ${id} order by position`,
      ),
    ),
});

/** @internal */
const listManuscripts = Effect.fn("listManuscripts")(function* listManuscripts() {
  const rows = yield* selectManuscripts(NO_TEXT);
  return pipe(rows, Array.map(manuscriptOf));
});

/** @internal */
const findManuscript = Effect.fn("findManuscript")(function* findManuscript(id: string) {
  const rows = yield* selectManuscripts(id);
  return pipe(rows, Array.head, Option.map(manuscriptOf));
});

/** @internal */
const readParagraphs = Effect.fn("readParagraphs")(function* readParagraphs(id: string) {
  return yield* selectParagraphs(id);
});

/** @internal */
const createManuscript = Effect.fn("createManuscript")(function* createManuscript() {
  const sql = yield* SqlClient.SqlClient;
  const random = yield* SecureRandom.SecureRandom;
  const now = yield* Clock.currentTimeMillis;
  const id = yield* random.uuidV7();
  yield* sql`insert into manuscripts (id, title, title_by, created_at, updated_at)
    values (${id}, ${NO_TEXT}, ${NO_TEXT}, ${now}, ${now})`;
  return Manuscript.make({ id, title: UNTITLED, excerpt: String.empty, updatedAt: now });
});

/** @internal */
const saveParagraphs = Effect.fn("saveParagraphs")(function* saveParagraphs({
  id,
  paragraphs,
}: Readonly<{ id: string; paragraphs: readonly (typeof Paragraph.Type)[] }>) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  yield* sql.withTransaction(
    Effect.gen(function* replace() {
      yield* sql`delete from paragraphs where manuscript_id = ${id}`;
      yield* Effect.forEach(
        paragraphs,
        (paragraph, position) =>
          sql`insert into paragraphs (manuscript_id, id, position, text)
            values (${id}, ${paragraph.id}, ${position}, ${paragraph.text})`,
        { discard: true },
      );
      yield* sql`update manuscripts set updated_at = ${now} where id = ${id}`;
    }),
  );
});

/** @internal */
const setTitle = Effect.fn("setTitle")(function* setTitle({
  id,
  title,
}: Readonly<{ id: string; title: typeof Title.Type | null }>) {
  const sql = yield* SqlClient.SqlClient;
  const text = pipe(
    Option.fromNullOr(title),
    Option.map(({ text: value }) => value),
    Option.getOrNull,
  );
  const by = pipe(
    Option.fromNullOr(title),
    Option.map(({ by: author }) => author),
    Option.getOrNull,
  );
  yield* sql`update manuscripts set title = ${text}, title_by = ${by} where id = ${id}`;
});

export {
  createManuscript,
  findManuscript,
  listManuscripts,
  readParagraphs,
  saveParagraphs,
  setTitle,
};
