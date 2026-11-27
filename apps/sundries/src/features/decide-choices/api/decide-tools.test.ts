import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Exit, Record as Rec, Schema, String as Str } from "effect";

import { MAX_QUESTIONS, DecideInput } from "./decide-input.ts";
import { decide } from "./decide-tools.ts";

const calls: unknown[][] = [];

const answers: unknown[] = [];

const decideWith = decide({
  AI: {
    run: (...call) => {
      calls.push(call);
      return Promise.resolve(answers.shift());
    },
  },
});

const QUESTION = {
  type: "choice",
  instructions: "Which role does snippet s0 play?",
  criteria: { done: "The final result", detail: "An intermediate step" },
} as const;

const INPUT = { snippets: { s0: "完了：PR を作成した。" }, questions: { s0: QUESTION } };

const ANSWER = { answers: { s0: { choice: "done", probabilities: { done: 0.93, detail: 0.07 } } } };

const NEARLY_FULL = 7000;
const SNIPPETS = 4;
const OVER = 1;

const questions = (count: number): (typeof DecideInput.Type)["questions"] =>
  Rec.fromEntries(Arr.makeBy(count, (index) => [`q${String(index)}`, QUESTION] as const));

const decodes = (input: unknown): boolean =>
  Exit.isSuccess(Schema.decodeUnknownExit(DecideInput)(input));

it.effect("sends the snippets and questions to Clef Flash through the gateway", () =>
  Effect.gen(function* sends() {
    answers.push(ANSWER);
    const decided = yield* decideWith(INPUT);
    expect(decided).toStrictEqual(ANSWER);
    expect(calls).toMatchObject([
      [
        "@cf/cloudflare/clef-flash",
        { model: "clef-flash", state: { snippets: INPUT.snippets }, questions: INPUT.questions },
        { gateway: { id: "default", metadata: { caller: "sundries.decide" } } },
      ],
    ]);
  }),
);

it.effect("fails when the model answers in another shape", () =>
  Effect.gen(function* malformed() {
    answers.push({ answers: { s0: { probabilities: {} } } });
    const exit = yield* Effect.exit(decideWith(INPUT));
    expect(Exit.isFailure(exit)).toBe(true);
  }),
);

it("accepts the most questions the model takes and refuses one more or none", () => {
  expect([
    decodes({ snippets: {}, questions: questions(MAX_QUESTIONS) }),
    decodes({ snippets: {}, questions: questions(MAX_QUESTIONS + OVER) }),
    decodes({ snippets: {}, questions: {} }),
  ]).toStrictEqual([true, false, false]);
});

it("refuses a state larger than the model reads", () => {
  const snippets = Rec.fromEntries(
    Arr.makeBy(SNIPPETS, (index) => [`s${String(index)}`, Str.repeat(NEARLY_FULL)("x")] as const),
  );
  expect(decodes({ snippets, questions: questions(OVER) })).toBe(false);
});
