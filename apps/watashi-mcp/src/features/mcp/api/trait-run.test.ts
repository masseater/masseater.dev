import { compile } from "@earendil-works/pi-schema";
import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { vi } from "vite-plus/test";

import { writeMemory } from "./memory-write.server";
import { settle } from "./trait-build.test.support";
import { RECORD_TOOL, traitExtension } from "./trait-pi";
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
    const summary = yield* buildTraits(conversation);
    expect(summary).toStrictEqual({ steps: ONCE, idle: true });
    expect(resets()).toBe(ONCE);
    const traits = yield* profileTraits({ scope: Option.none(), topic: Option.none() });
    expect(traits).toMatchObject({ stack: [{ statement: "Use Neovim as the editor." }] });
  }),
);

it.effect("記録の呼び出しが無ければ失敗し、源を読んだ印を進めない", () =>
  Effect.gen(function* failsWithoutCall() {
    yield* setUp;
    const silent = fake(() => [assistant([{ type: "text", text: "done" }])]);
    const failure = yield* Effect.flip(buildTraits(silent.conversation));
    expect(failure).toMatchObject({ _tag: "AnalystFailed" });
    const retried = fake(() => [recorded]);
    const summary = yield* buildTraits(retried.conversation);
    expect(summary).toStrictEqual({ steps: ONCE, idle: true });
  }),
);

it("記録の道具の引数は、Pi の検査でも Effect Schema と同じ形だけを通す", () => {
  const parameters = pipe(
    Option.fromUndefinedOr(traitExtension().tools),
    Option.flatMap(Arr.head),
    Option.map((tool) => tool.parameters),
    Option.getOrThrow,
  );
  const validator = compile(parameters);
  expect([
    validator.check(created(SOURCE)),
    validator.check({ observations: [{ action: "new", source: SOURCE }] }),
    validator.check({ observations: [{ action: "guess", source: SOURCE, quote: EDITOR }] }),
  ]).toStrictEqual([true, false, false]);
});
