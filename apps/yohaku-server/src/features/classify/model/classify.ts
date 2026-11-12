import { Classified, ParagraphKind } from "@masseater.dev/yohaku-protocol";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, HashMap, Option, Schema, String, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

import { judgeAs } from "#shared/agent";

const NO_TOOLS: readonly string[] = [];
const LINE_BREAK = "\n";

const KindRow = Schema.Struct({ text: Schema.String, kind: ParagraphKind });

type Judged = typeof KindRow.Type;

const NOTHING_JUDGED: readonly Judged[] = [];

const Answer = Schema.Struct({
  kinds: Schema.Array(Schema.Struct({ index: Schema.Int, kind: ParagraphKind })),
});

const SYSTEM = `あなたは小説の原稿を読む担当編集です。書き手は本文・メモ・ネタを区別せず一枚の紙に書いています。
番号つきの行それぞれが次のどれかを判定してください。
- prose: 作品の本文として書かれた文。地の文や台詞。
- memo: これから書く場面の覚え書き。単語や短い句を並べた走り書き、展開の指示、「〜する？」のような自問。
- idea: この場面とは別の、いつか使いたい思いつき。
迷ったら prose にしてください。`;

const selectKinds = SqlSchema.findAll({
  Request: Schema.Array(Schema.String),
  Result: KindRow,
  execute: (texts) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap(
        (sql) => sql`select text, kind from paragraph_kinds where ${sql.in("text", texts)}`,
      ),
    ),
});

const promptOf = (texts: readonly string[]): string =>
  pipe(
    texts,
    Array.map((text, index) => `${globalThis.String(index)}: ${text}`),
    Array.join(LINE_BREAK),
  );

const remember = Effect.fn("remember")(function* remember(judged: readonly Judged[]) {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.forEach(
    judged,
    ({ text, kind }) =>
      sql`insert into paragraph_kinds (text, kind) values (${text}, ${kind})
        on conflict (text) do update set kind = excluded.kind`,
    { discard: true },
  );
});

const judgeKinds = Effect.fn("judgeKinds")(function* judgeKinds(texts: readonly string[]) {
  if (Array.isReadonlyArrayEmpty(texts)) {
    return NOTHING_JUDGED;
  }
  const { kinds } = yield* judgeAs(Answer)({
    system: SYSTEM,
    prompt: promptOf(texts),
    tools: NO_TOOLS,
  });
  const judged = pipe(
    kinds,
    Array.map(({ index, kind }) =>
      pipe(
        Array.get(texts, index),
        Option.map((text) => ({ text, kind })),
      ),
    ),
    Array.getSomes,
  );
  yield* remember(judged);
  return judged;
});

const classifiedAs =
  (kinds: HashMap.HashMap<string, typeof ParagraphKind.Type>) =>
  ({ id, text }: typeof Paragraph.Type): Option.Option<typeof Classified.Type> =>
    pipe(
      HashMap.get(kinds, text),
      Option.map((kind) => Classified.make({ paragraphId: id, kind })),
    );

/** @internal */
const classify = Effect.fn("classify")(function* classify(
  paragraphs: readonly (typeof Paragraph.Type)[],
) {
  const written = pipe(
    paragraphs,
    Array.filter(({ text }) => String.isNonEmpty(String.trim(text))),
  );
  const texts = pipe(
    written,
    Array.map(({ text }) => text),
    Array.dedupe,
  );
  const known = yield* selectKinds(texts);
  const knownTexts = pipe(
    known,
    Array.map(({ text }) => text),
  );
  const unknown = pipe(texts, Array.difference(knownTexts));
  const judged = yield* judgeKinds(unknown);
  const kinds = pipe(
    [...known, ...judged],
    Array.map(({ text, kind }) => [text, kind] as const),
    HashMap.fromIterable,
  );
  return pipe(written, Array.map(classifiedAs(kinds)), Array.getSomes);
});

export { classify };
