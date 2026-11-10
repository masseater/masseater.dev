import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase, env, resetDatabase } from "./d1.test.support.ts";
import { routeLifeRead } from "./life-read-route.server";
import { SCAN_LIMIT } from "./life-store.server";
import { writeLife } from "./life-write.server";
import { watashiSearch } from "./watashi-search.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const book = { record: "media_item", source: "said", mediaType: "book", title: "三体" } as const;

const sql = (statement: string): Effect.Effect<unknown> =>
  Effect.promise(() => env.DB.prepare(statement).run());

const fillers = (record: string, count: number): string => `WITH RECURSIVE numbers(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < ${count}
)
INSERT INTO life_record (record, source, label, about, body, search_text, created_at, updated_at)
SELECT '${record}', 'said', 'book', 'filler ' || n,
  json_object('mediaType', 'book', 'title', 'filler ' || n, 'status', 'open'),
  'filler ' || n, '2026-11-08T00:00:00.000Z', '2026-11-08T00:00:00.000Z'
FROM numbers`;

const OTHER_FACTS = `WITH RECURSIVE numbers(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < ${SCAN_LIMIT}
)
INSERT INTO life_record (record, source, label, about, body, created_at, updated_at)
SELECT 'profile_fact', 'said', 'topic ' || n, 'self',
  json_object('about', 'self', 'topic', 'topic ' || n, 'statement', 'statement ' || n),
  '2026-11-08T00:00:00.000Z', '2026-11-08T00:00:00.000Z'
FROM numbers`;

const home = (statement: string, since: string) =>
  ({ record: "profile_fact", source: "said", topic: "住まい", statement, since }) as const;

const typesOf = (notices: readonly Readonly<{ type: string }>[]): readonly string[] =>
  pipe(
    notices,
    Arr.map((notice) => notice.type),
  );

const SCAN_NOTICE = { notices: [{ type: "scan_limit" }] };

it.effect("1 回の走査に収まらない数の作品があっても、同じ作品は更新として扱う", () =>
  Effect.gen(function* findsOldMedia() {
    yield* resetDatabase;
    const first = yield* writeLife(writer)([{ ...book, status: "doing" }]);
    yield* sql(fillers("media_item", SCAN_LIMIT));
    const second = yield* writeLife(writer)([{ ...book, status: "done" }]);
    expect(second.written).toStrictEqual(first.written);
  }),
);

it.effect("1 回の走査に収まらない数の事実があっても、今の事実を終わらせる", () =>
  Effect.gen(function* findsOldFact() {
    yield* resetDatabase;
    yield* writeLife(writer)([home("池袋に住んでいる", "2020-04")]);
    yield* sql(OTHER_FACTS);
    const moved = yield* writeLife(writer)([home("新宿に住んでいる", "2024-04")]);
    expect(typesOf(moved.notices)).toContain("replaced");
  }),
);

it.effect("読み取りが走査の上限に届いたら、結果で知らせる", () =>
  Effect.gen(function* reportsScanLimit() {
    yield* resetDatabase;
    yield* sql(fillers("todo", SCAN_LIMIT));
    const within = yield* routeLifeRead({ record: "todo" });
    expect(within).toMatchObject({ total: SCAN_LIMIT });
    expect(within).not.toHaveProperty("notices");
    yield* writeLife(writer)([{ record: "todo", source: "said", title: "filler の次" }]);
    const beyond = yield* routeLifeRead({ record: "todo" });
    expect(beyond).toMatchObject({ total: SCAN_LIMIT, ...SCAN_NOTICE });
    const found = yield* watashiSearch({ query: "filler" });
    expect(found).toMatchObject(SCAN_NOTICE);
  }),
);
