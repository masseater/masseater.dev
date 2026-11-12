import { compile } from "@earendil-works/pi-schema";
import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { vi } from "vite-plus/test";

import { writeMemory } from "./memory-write.server";
import { pastBudget, settle } from "./trait-build.test.support";
import { RECORD_TOOL, traitRegistry } from "./trait-pi";
import { profileTraits } from "./trait-read.server";
import { buildTraits } from "./trait-run.server";
import type { Conversation } from "./trait-run.server";
import { closeDatabase, resetDatabase } from "./trait.test.support.ts";

vi.mock("cloudflare:workers", () => import("./trait.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const EDITOR = "毎日 Neovim で書いている";

const USAGE = { input: 120, output: 30, cacheRead: 0, cacheWrite: 0 };

const SOURCE = "memory:1";

const ONCE = 1;

const NONE = 0;

const assistant = (content: readonly unknown[]): unknown => ({
  kind: "pi.assistant",
  model: [{ role: "assistant", content, usage: USAGE }],
});

const call = (args: unknown): unknown => ({ type: "toolCall", name: RECORD_TOOL, arguments: args });

const created = (source: string): unknown => ({
  observations: [
    {
      action: "new",
      source,
      quote: EDITOR,
      kind: "stack",
      limited: false,
      statement: "Use Neovim as the editor.",
      why: "",
    },
  ],
});

const JAPANESE = "エディタは Neovim を使う。";

const translator = {
  translate: (): Promise<Readonly<{ text: string }>> => Promise.resolve({ text: JAPANESE }),
};

const recorded = assistant([{ type: "text", text: "retrying" }, call(created(SOURCE))]);

type Fake = Readonly<{ conversation: Conversation; resets: () => number }>;

const fake = (answer: (input: string) => readonly unknown[]): Fake => {
  const counted = { resets: 0 };
  return {
    conversation: {
      reset: () => {
        counted.resets += 1;
        return Promise.resolve();
      },
      prompt: (input) => Promise.resolve({ status: "done", messages: answer(input) }),
    },
    resets: () => counted.resets,
  };
};

const setUp = resetDatabase.pipe(
  Effect.andThen(
    writeMemory({ actor: "test" })({
      project: "assistant",
      name: "editor",
      description: "エディタ",
      content: EDITOR,
    }),
  ),
  Effect.andThen(settle),
);

it.effect("会話の最後の正しい記録の呼び出しから特性を作る", () =>
  Effect.gen(function* recordsFromTranscript() {
    yield* setUp;
    const { conversation, resets } = fake((input) => [
      { kind: "pi.user", model: [{ role: "user", content: input }] },
      assistant([call({ observations: [{ action: "new" }] })]),
      recorded,
    ]);
    const summary = yield* buildTraits({ conversation, translator });
    expect(summary).toStrictEqual({ steps: ONCE, idle: true, translated: ONCE });
    expect(resets()).toBe(ONCE);
    const traits = yield* profileTraits({ scope: Option.none(), topic: Option.none() });
    expect(traits).toMatchObject({
      stack: [{ statement: "Use Neovim as the editor.", ja: { statement: JAPANESE } }],
    });
    const again = yield* buildTraits({ conversation, translator });
    expect(again).toStrictEqual({ steps: NONE, idle: true, translated: NONE });
  }),
);

it.effect("記録の呼び出しが無ければ失敗し、源を読んだ印を進めない", () =>
  Effect.gen(function* failsWithoutCall() {
    yield* setUp;
    const silent = fake(() => [assistant([{ type: "text", text: "done" }])]);
    const failure = yield* Effect.flip(
      buildTraits({ conversation: silent.conversation, translator }),
    );
    expect(failure).toMatchObject({ _tag: "AnalystFailed" });
    const retried = fake(() => [recorded]);
    const summary = yield* buildTraits({ conversation: retried.conversation, translator });
    expect(summary).toStrictEqual({ steps: ONCE, idle: true, translated: ONCE });
  }),
);

const nothingFound = assistant([call({ observations: [] })]);

const refusing = {
  translate: (): Promise<Readonly<{ text: string }>> => Promise.reject(new Error("down")),
};

it.effect("作るのに時間を使い切っても、前の回に作った特性を先に訳す", () =>
  Effect.gen(function* translatesBeforeBuilding() {
    yield* setUp;
    const first = fake(() => [recorded]);
    yield* Effect.flip(buildTraits({ conversation: first.conversation, translator: refusing }));
    yield* writeMemory({ actor: "test" })({
      project: "assistant",
      name: "terminal",
      description: "端末",
      content: "端末は Ghostty を使う",
    });
    yield* settle;
    const services = yield* Effect.context();
    const slow: Conversation = {
      reset: () => Promise.resolve(),
      prompt: () =>
        Effect.runPromiseWith(services)(
          pastBudget.pipe(Effect.as({ status: "done", messages: [nothingFound] })),
        ),
    };
    const summary = yield* buildTraits({ conversation: slow, translator });
    expect(summary).toStrictEqual({ steps: ONCE, idle: false, translated: ONCE });
  }),
);

it("記録の道具の引数は、Pi の検査でも Effect Schema と同じ形だけを通す", () => {
  const parameters = pipe(
    traitRegistry().snapshot().tools(),
    Arr.head,
    Option.map((installed) => installed.tool.parameters),
    Option.getOrThrow,
  );
  const validator = compile(parameters);
  expect([
    validator.check(created(SOURCE)),
    validator.check({ observations: [{ action: "new", source: SOURCE }] }),
    validator.check({ observations: [{ action: "guess", source: SOURCE, quote: EDITOR }] }),
  ]).toStrictEqual([true, false, false]);
});

it("特性の拡張は Pi の registry に入れられる", () => {
  expect(traitRegistry).not.toThrow();
});
