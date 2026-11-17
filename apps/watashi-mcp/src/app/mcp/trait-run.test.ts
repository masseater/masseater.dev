import { compile } from "@earendil-works/pi-schema";
import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { vi } from "vite-plus/test";

import { profileTraits } from "#/entities/trait/index.server.ts";
import {
  RECORD_TOOL,
  traitRegistry,
  buildTraits,
} from "#/features/build-traits/index.test.support.ts";
import type { Conversation } from "#/features/build-traits/index.test.support.ts";
import { watashiProfile, writeMemory } from "#/features/manage-memory/index.test.support.ts";
import { encodeJson } from "#/shared/db/index.server.ts";

import { pastBudget, settle } from "./trait-build.test.support.ts";
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
  run: (): Promise<unknown> => Promise.resolve({ choices: [{ message: { content: JAPANESE } }] }),
};

const FIRST_TRAIT = 1;

const MERGED = {
  rules: [
    { section: "limits", repo: "", rule: "Never use Python.", refs: [FIRST_TRAIT] },
    { section: "work", repo: "", rule: "Always use Neovim as the editor.", refs: [FIRST_TRAIT] },
  ],
};

const EDITED = {
  summary: ["The owner writes code in Neovim."],
  who: [],
  now: ["watashi-mcp"],
  sections: [
    {
      section: "limits",
      repo: "",
      topics: [{ title: "Tools", items: [{ text: "Never use Python.", ids: ["R1"] }] }],
    },
    {
      section: "work",
      repo: "",
      topics: [
        { title: "Editor", items: [{ text: "Always use Neovim as the editor.", ids: ["R1"] }] },
      ],
    },
    {
      section: "communication",
      repo: "",
      topics: [
        {
          title: "Language",
          items: [{ text: "Always write to the owner in Japanese.", ids: ["R1"] }],
        },
      ],
    },
  ],
};

const STEP = Schema.Struct({
  response_format: Schema.Struct({ json_schema: Schema.Struct({ name: Schema.String }) }),
});

const asked = { merges: 0 };

const isStep = Schema.is(STEP);

const answerFor = (inputs: unknown): unknown => {
  if (isStep(inputs) && inputs.response_format.json_schema.name === "merge") {
    asked.merges += 1;
    return MERGED;
  }
  return EDITED;
};

const ai = {
  run: (_model: string, inputs: unknown): Promise<unknown> =>
    Effect.runPromise(
      encodeJson(answerFor(inputs)).pipe(
        Effect.map((content) => ({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 100, completion_tokens: 40 },
        })),
      ),
    ),
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
    const summary = yield* buildTraits({ conversation, translator, ai });
    expect(summary).toStrictEqual({
      steps: ONCE,
      idle: true,
      translated: ONCE,
      profile: "written",
    });
    expect(resets()).toBe(ONCE);
    const traits = yield* profileTraits({ scope: Option.none(), topic: Option.none() });
    expect(traits).toMatchObject({
      stack: [{ statement: "Use Neovim as the editor.", ja: { statement: JAPANESE } }],
    });
    const again = yield* buildTraits({ conversation, translator, ai });
    expect(again).toStrictEqual({
      steps: NONE,
      idle: true,
      translated: NONE,
      profile: "unchanged",
    });
  }),
);

const silent = fake(() => [assistant([{ type: "text", text: "done" }])]);

const retried = fake(() => [recorded]);

const WRITTEN = { steps: ONCE, idle: true, translated: ONCE, profile: "written" };

it.effect("記録の呼び出しが無ければ失敗し、源を読んだ印を進めないが、人物像は作る", () =>
  Effect.gen(function* failsWithoutCall() {
    yield* setUp;
    const before = asked.merges;
    const failure = yield* Effect.flip(
      buildTraits({ conversation: silent.conversation, translator, ai }),
    );
    expect(failure).toMatchObject({
      _tag: "AnalystFailed",
      message: "no record_observations call (done ): stop=none parts=text",
    });
    expect(asked.merges).toBe(before + ONCE);
    const summary = yield* buildTraits({ conversation: retried.conversation, translator, ai });
    expect(summary).toStrictEqual(WRITTEN);
    const profile = yield* watashiProfile({});
    expect(profile).toContain("## How to work with me\n- Always use Neovim as the editor. [1]");
    expect(profile).toContain("- Never use Python. [1]");
  }),
);

const nothingFound = assistant([call({ observations: [] })]);

const refusing = {
  run: (): Promise<unknown> => Promise.reject(new Error("down")),
};

it.effect("作るのに時間を使い切っても、前の回に作った特性を先に訳す", () =>
  Effect.gen(function* translatesBeforeBuilding() {
    yield* setUp;
    const first = fake(() => [recorded]);
    yield* Effect.flip(buildTraits({ conversation: first.conversation, translator: refusing, ai }));
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
    const summary = yield* buildTraits({ conversation: slow, translator, ai });
    expect(summary).toStrictEqual({
      steps: ONCE,
      idle: false,
      translated: ONCE,
      profile: "written",
    });
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
