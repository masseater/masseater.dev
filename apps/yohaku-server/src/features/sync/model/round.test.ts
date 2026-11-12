import { expect, layer } from "@effect/vitest";
import { ManuscriptBody } from "@masseater.dev/yohaku-protocol/sync";
import { Array, Effect, Option, Ref, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { pendingCount } from "./outbox.ts";
import { Remote, syncTestLayer } from "./remote.test.support.ts";
import { syncRound } from "./round.ts";

const TOKEN = "token";
const WRITTEN_AT = 1000;
const ELSEWHERE_AT = 2000;
const FIRST_REVISION = 1;
const NOTHING = 0;
const LINE = "ヤチヨは保管庫の奥から、古いアバターを引っぱり出した。";
const ELSEWHERE = "別の机で書いた一行。";

const encodeManuscript = Schema.encodeEffect(Schema.fromJsonString(ManuscriptBody));
const decodeManuscript = Schema.decodeEffect(Schema.fromJsonString(ManuscriptBody));

const writeLocally = Effect.gen(function* writeLocally() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into manuscripts (id, created_at, updated_at)
    values ('m1', ${WRITTEN_AT}, ${WRITTEN_AT})`;
  yield* sql`insert into paragraphs (manuscript_id, id, position, text) values ('m1', 'p1', 0, ${LINE})`;
});

const remoteTexts = Effect.gen(function* remoteTexts() {
  const stored = yield* Remote.pipe(Effect.flatMap(Ref.get));
  const bodies = yield* pipe(
    stored,
    Effect.forEach(({ body }) => decodeManuscript(body)),
  );
  return pipe(
    bodies,
    Array.flatMap(({ paragraphs }) => paragraphs),
    Array.map(({ text }) => text),
  );
});

const localTexts = Effect.gen(function* localTexts() {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ readonly text: string }>`select text from paragraphs order by position`;
  return pipe(
    rows,
    Array.map(({ text }) => text),
  );
});

const writeElsewhere = Effect.gen(function* writeElsewhere() {
  const body = yield* encodeManuscript({
    title: Option.getOrNull(Option.none()),
    createdAt: ELSEWHERE_AT,
    paragraphs: [{ id: "p9", text: ELSEWHERE }],
  });
  const remote = yield* Remote;
  yield* Ref.set(remote, [
    {
      kind: "manuscript",
      id: "m9",
      updatedAt: ELSEWHERE_AT,
      deleted: false,
      body,
      revision: FIRST_REVISION,
    },
  ]);
});

layer(syncTestLayer)("sync round after writing", (it) => {
  it.effect("sends what was written and leaves nothing waiting", () =>
    Effect.gen(function* sends() {
      yield* writeLocally;
      yield* syncRound(TOKEN);
      const sent = yield* remoteTexts;
      const waiting = yield* pendingCount();
      expect(sent).toEqual([LINE]);
      expect(waiting).toBe(NOTHING);
    }),
  );
});

layer(syncTestLayer)("sync round after another device wrote", (it) => {
  it.effect("takes in what another device wrote without sending it back", () =>
    Effect.gen(function* takesIn() {
      yield* writeElsewhere;
      yield* syncRound(TOKEN);
      const local = yield* localTexts;
      const waiting = yield* pendingCount();
      expect(local).toEqual([ELSEWHERE]);
      expect(waiting).toBe(NOTHING);
    }),
  );
});

layer(syncTestLayer)("sync round after deleting", (it) => {
  it.effect("sends a deletion", () =>
    Effect.gen(function* deletes() {
      yield* writeLocally;
      yield* syncRound(TOKEN);
      const sql = yield* SqlClient.SqlClient;
      yield* sql`delete from manuscripts where id = 'm1'`;
      yield* syncRound(TOKEN);
      const stored = yield* Remote.pipe(Effect.flatMap(Ref.get));
      expect(
        pipe(
          stored,
          Array.map(({ deleted }) => deleted),
        ),
      ).toEqual([true]);
    }),
  );
});
