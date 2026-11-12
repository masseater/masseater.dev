import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Number as Num, Option, String as Str, pipe } from "effect";
import { vi } from "vite-plus/test";

import { TRAIT_STEP_CHARACTERS } from "#/shared/config";

import { writeLife } from "./life-write.server";
import { writeMemory } from "./memory-write.server";
import { watashiProfile } from "./profile-read.server";
import {
  drain,
  forgetRequests,
  nothing,
  requestAt,
  requests,
  sourcesOf,
} from "./trait-build.test.support";
import { closeDatabase, env, resetDatabase, transcripts } from "./trait.test.support.ts";

vi.mock("cloudflare:workers", () => import("./trait.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const AT = "2026-11-09T15:19:34.000Z";

const OBJECT = "claude-code/s1/main/0.jsonl.gz";

const FIRST = 0;

const SECOND = 1;

const HALF = 2;

const MARGIN = 10;

const PAST_LIMIT = 1;

const MANY = 20;

const TOPIC_HITS = 15;

const NEAREST = 8;

const fresh = forgetRequests.pipe(Effect.andThen(resetDatabase));

const textsOf = (index: number): readonly string[] =>
  pipe(
    requestAt(index),
    Option.match({
      onNone: () => [],
      onSome: (request) =>
        pipe(
          request.sources,
          Arr.map((source) => source.text),
        ),
    }),
  );

it.effect("人生の記録の本人の事実も読む", () =>
  Effect.gen(function* readsLifeRecords() {
    yield* fresh;
    yield* writeLife(writer)([
      { record: "profile_fact", source: "said", topic: "朝型", statement: "朝 5 時に起きる" },
      { record: "todo", source: "said", title: "確定申告" },
    ]);
    const outcomes = yield* drain(nothing);
    expect(outcomes).toMatchObject([{ origin: "life", sources: 1 }]);
    const found = pipe(textsOf(FIRST), Arr.some(Str.includes("朝 5 時に起きる")));
    expect(found).toBe(true);
  }),
);

const user = `{"type":"user","cwd":"/home/user","entrypoint":"cli","gitBranch":"main","isSidechain":false,"parentUuid":null,"sessionId":"s1","userType":"external","version":"2.1.0","uuid":"u1","timestamp":"${AT}","message":{"role":"user","content":"テストは先に書いて"}}`;

const assistant = `{"type":"assistant","uuid":"a1","timestamp":"${AT}","message":{"content":"テストを足しました"}}`;

const insertChunk = Effect.promise(() => {
  transcripts.set(OBJECT, `${user}\n${assistant}\n`);
  return env.DB.prepare(
    `INSERT INTO conversation_chunk VALUES ('claude-code', 's1', 'main', 0, 10, 0, 10, '${OBJECT}', '1970-01-01T00:00:00.000Z')`,
  ).run();
});

it.effect("会話からは本人の発言だけを読み、AI の発言の引用は捨てる", () =>
  Effect.gen(function* readsOwnerUtterances() {
    yield* fresh;
    yield* insertChunk;
    const outcomes = yield* drain((request) =>
      pipe(
        request.sources,
        Arr.map((source) => ({
          action: "new" as const,
          source: source.ref,
          quote: "テストを足しました",
          kind: "workstyle" as const,
          limited: false,
          statement: "Write tests first.",
          why: "",
        })),
      ),
    );
    expect(outcomes).toMatchObject([
      { origin: "conversation", sources: 1, accepted: 0, rejected: 1 },
    ]);
    expect(
      pipe(
        requestAt(FIRST),
        Option.map((request) => request.sources),
      ),
    ).toStrictEqual(
      Option.some([{ ref: "conversation:s1/u1", text: "テストは先に書いて", candidates: [] }]),
    );
  }),
);

it.effect("一度に読める量を超える源も切り捨てずにすべて読む", () =>
  Effect.gen(function* readsEverything() {
    yield* fresh;
    const big = Str.repeat(TRAIT_STEP_CHARACTERS / HALF - MARGIN)("あ");
    const huge = Str.repeat(TRAIT_STEP_CHARACTERS + PAST_LIMIT)("い");
    yield* Effect.forEach(["one", "two", "three"], (name) =>
      writeMemory(writer)({ project: "assistant", name, description: name, content: big }),
    );
    yield* writeMemory(writer)({
      project: "assistant",
      name: "huge",
      description: "h",
      content: huge,
    });
    const outcomes = yield* drain(nothing);
    expect(sourcesOf(outcomes)).toStrictEqual([SECOND, SECOND, SECOND, SECOND]);
    const read = Num.sumAll(
      pipe(
        requests,
        Arr.flatMap((request) => request.sources),
        Arr.map((source) => Str.length(source.text)),
      ),
    );
    expect(read).toBeGreaterThan(TRAIT_STEP_CHARACTERS * HALF);
  }),
);

const topics = Arr.makeBy(
  MANY,
  (index) => `topic-${String(index)} ${Str.repeat(index + PAST_LIMIT)("x")}`,
);

const learnsEach = drain((request) =>
  pipe(
    request.sources,
    Arr.map((source) => ({
      action: "new" as const,
      source: source.ref,
      quote: pipe(
        topics,
        Arr.findFirst((topic) => Str.includes(topic)(source.text)),
        Option.getOrElse(() => "missing"),
      ),
      kind: "preference" as const,
      limited: false,
      statement: `Prefer ${source.ref}.`,
      why: "",
    })),
  ),
);

it.effect("LLM には近い特性だけを候補として渡し、話題で特性を絞れる", () =>
  Effect.gen(function* passesNearestOnly() {
    yield* fresh;
    yield* pipe(
      topics,
      Effect.forEach((content, index) =>
        writeMemory(writer)({
          project: "assistant",
          name: `t${String(index)}`,
          description: "t",
          content,
        }),
      ),
    );
    yield* learnsEach;
    yield* writeMemory(writer)({
      project: "assistant",
      name: "late",
      description: "t",
      content: "yyy",
    });
    yield* drain(nothing);
    const last = pipe(
      Arr.last(requests),
      Option.map((request) => request.traits.length),
    );
    expect(last).toStrictEqual(Option.some(NEAREST));
    const narrowed = yield* watashiProfile({ topic: "xxxxxxxxxxxx" });
    expect(narrowed).toHaveProperty(["traits", "preference", "length"], TOPIC_HITS);
  }),
);
