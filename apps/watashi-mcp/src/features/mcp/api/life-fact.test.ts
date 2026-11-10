import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase, env, resetDatabase } from "./d1.test.support.ts";
import { routeLifeRead } from "./life-read-route.server";
import { writeLife } from "./life-write.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const HOME = "住まい";

const home = (statement: string, since: string) =>
  ({ record: "profile_fact", source: "said", topic: HOME, statement, since }) as const;

const ikebukuro = home("池袋に住んでいる", "2020-04");

const sql = (statement: string): Effect.Effect<unknown> =>
  Effect.promise(() => env.DB.prepare(statement).run());

const REFUSE_SHINJUKU = `CREATE TRIGGER refuse_shinjuku BEFORE INSERT ON life_record
WHEN NEW.record = 'profile_fact' AND NEW.body LIKE '%新宿%'
BEGIN SELECT RAISE(ABORT, 'refused by the test'); END`;

const typesOf = (notices: readonly Readonly<{ type: string }>[]): readonly string[] =>
  pipe(
    notices,
    Arr.map((notice) => notice.type),
  );

const homeNow = routeLifeRead({ record: "profile_fact", topics: [HOME], asOf: "2025-01" });

const moveToShinjuku = writeLife(writer)([home("新宿に住んでいる", "2024-04")]);

const refusedMove = sql(REFUSE_SHINJUKU).pipe(
  Effect.andThen(Effect.flip(moveToShinjuku)),
  Effect.tap(() => sql("DROP TRIGGER refuse_shinjuku")),
);

const FIRST_REVISION_ONLY = 1;

it.effect("期間の閉じた事実を足しても、今の事実は終わらない", () =>
  Effect.gen(function* keepsOpenFact() {
    yield* resetDatabase;
    yield* writeLife(writer)([ikebukuro]);
    const trip = yield* writeLife(writer)([
      { ...home("大阪に長く出張していた", "2022-01"), until: "2022-03" },
    ]);
    expect(typesOf(trip.notices)).not.toContain("replaced");
    const later = yield* homeNow;
    expect(later).toMatchObject({ total: 1, items: [{ statement: "池袋に住んでいる" }] });
  }),
);

it.effect("新しい事実を書けなければ、今の事実も終わらせない", () =>
  Effect.gen(function* endsAndAddsTogether() {
    yield* resetDatabase;
    const first = yield* writeLife(writer)([ikebukuro]);
    const failure = yield* refusedMove;
    expect(failure).toMatchObject({ _tag: "StorageFailed" });
    const ref = yield* Effect.fromOption(Arr.head(first.written));
    const history = yield* routeLifeRead({ ref, revisions: true });
    expect(history["revisions"]).toHaveLength(FIRST_REVISION_ONLY);
    const now = yield* homeNow;
    expect(now).toMatchObject({ total: 1, items: [{ statement: "池袋に住んでいる" }] });
  }),
);
