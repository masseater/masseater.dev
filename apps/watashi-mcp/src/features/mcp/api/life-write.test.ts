import { afterAll, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase, env, resetDatabase } from "./d1.test.support.ts";
import { routeLifeRead } from "./life-read-route.server";
import { writeLife } from "./life-write.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const NIGHT = "2026-11-08";

const KIND_AND_EVENT = 2;

const todo = (title: string) => ({ record: "todo", source: "said", title }) as const;

const foreignIds = {
  record: "media_item",
  source: "said",
  mediaType: "book",
  title: "三体",
  ids: { steamAppId: "570" },
} as const;

const sleepKind = (properties: Readonly<Record<string, unknown>>) =>
  ({
    record: "event_kind",
    kind: "sleep",
    valuesSchema: { type: "object", additionalProperties: false, properties },
  }) as const;

const HOURS = { sleep_hours: { type: "number", minimum: 0 } };

const slept = (values: Readonly<Record<string, number>>) =>
  ({
    record: "life_event",
    source: "said",
    text: "寝た",
    at: NIGHT,
    kind: "sleep",
    values,
  }) as const;

const sql = (statement: string): Effect.Effect<unknown> =>
  Effect.promise(() => env.DB.prepare(statement).run());

const REFUSE_FAILING_TODO = `CREATE TRIGGER refuse_failing_todo BEFORE INSERT ON life_record
WHEN NEW.record = 'todo' AND NEW.about = '失敗する'
BEGIN SELECT RAISE(ABORT, 'refused by the test'); END`;

const todos = routeLifeRead({ record: "todo" });

it.effect("通らない記録が 1 件でもあれば、どの記録も書かない", () =>
  Effect.gen(function* writesNothing() {
    yield* resetDatabase;
    const failure = yield* Effect.flip(writeLife(writer)([todo("洗濯"), todo("掃除"), foreignIds]));
    expect(failure).toMatchObject({ _tag: "InvalidRecord" });
    expect(failure).toHaveProperty("message", expect.stringContaining("records[2]"));
    const listed = yield* todos;
    expect(listed).toMatchObject({ total: 0 });
  }),
);

it.effect("無い ref を直す記録があれば、どの記録も書かない", () =>
  Effect.gen(function* refusesMissingRef() {
    yield* resetDatabase;
    const failure = yield* Effect.flip(
      writeLife(writer)([todo("洗濯"), { ref: "todo:99", title: "掃除" }]),
    );
    expect(failure).toMatchObject({ _tag: "RecordNotFound", ref: "todo:99" });
    const listed = yield* todos;
    expect(listed).toMatchObject({ total: 0 });
  }),
);

it.effect("valuesSchema に合わない値があれば、どの記録も書かない", () =>
  Effect.gen(function* refusesValues() {
    yield* resetDatabase;
    yield* writeLife(writer)([sleepKind(HOURS)]);
    const failure = yield* Effect.flip(writeLife(writer)([todo("洗濯"), slept({ naps: 1 })]));
    expect(failure).toMatchObject({ _tag: "InvalidRecord" });
    expect(failure).toHaveProperty("message", expect.stringContaining("records[1]"));
    const listed = yield* todos;
    expect(listed).toMatchObject({ total: 0 });
  }),
);

it.effect("同じ呼び出しで valuesSchema を広げた kind の値は書ける", () =>
  Effect.gen(function* widensKind() {
    yield* resetDatabase;
    yield* writeLife(writer)([sleepKind(HOURS)]);
    const result = yield* writeLife(writer)([
      sleepKind({ ...HOURS, naps: { type: "number" } }),
      slept({ naps: 1 }),
    ]);
    expect(result.written).toHaveLength(KIND_AND_EVENT);
  }),
);

it.effect("書いている途中で保存に失敗したら、書けた ref を知らせる", () =>
  Effect.gen(function* reportsWritten() {
    yield* resetDatabase;
    yield* sql(REFUSE_FAILING_TODO);
    const failure = yield* Effect.flip(
      writeLife(writer)([todo("洗濯"), todo("失敗する"), todo("掃除")]),
    );
    yield* sql("DROP TRIGGER refuse_failing_todo");
    const listed = yield* todos;
    expect(listed).toMatchObject({ total: 1, items: [{ ref: "todo:1" }] });
    expect(failure).toMatchObject({ _tag: "StorageFailed" });
    expect(failure).toHaveProperty("message", expect.stringContaining("records[1]"));
    expect(failure).toHaveProperty("message", expect.stringContaining("Already written: todo:1."));
  }),
);
