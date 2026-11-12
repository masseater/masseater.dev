import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, String as Str } from "effect";

import { CHUNK_CHARACTERS } from "./config.ts";
import { promptOf } from "./prompt.ts";
import { translateWith } from "./translate.ts";

type Call = Readonly<{ prompt: string; maxTokens: number }>;

const FIRST = Str.repeat(CHUNK_CHARACTERS)("a");
const FIRST_TOKENS = 3256;
const SECOND_TOKENS = 259;

const FIRST_PROMPT = promptOf({ direction: { to: "en" }, previous: Option.none(), text: FIRST });
const SECOND_PROMPT = promptOf({
  direction: { to: "en" },
  previous: Option.some({ source: FIRST, translation: "A" }),
  text: "b",
});

const ANSWERS: ReadonlyMap<string, string> = new Map([
  [FIRST_PROMPT, "A"],
  [SECOND_PROMPT, "B"],
]);

describe("translateWith", () => {
  it.effect("区切りごとに前の区切りの訳を添えて問い、空白はそのまま残す", () =>
    Effect.gen(function* translatesInOrder() {
      const calls: Call[] = [];
      const complete = (call: Call): Effect.Effect<string> => {
        calls.push(call);
        return Effect.succeed(ANSWERS.get(call.prompt) ?? "");
      };
      const text = yield* translateWith(complete)({ text: ` ${FIRST}\n\nb `, to: "en" });
      expect(text).toBe(" A\n\nB ");
      expect(calls).toStrictEqual([
        { prompt: FIRST_PROMPT, maxTokens: FIRST_TOKENS },
        { prompt: SECOND_PROMPT, maxTokens: SECOND_TOKENS },
      ]);
    }),
  );
});
