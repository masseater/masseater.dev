import { expect, it } from "@effect/vitest";
import { Effect, Exit, Schema } from "effect";
import { vi } from "vite-plus/test";

import { DecideInput } from "./decide-input.ts";

const run = vi.hoisted(() => vi.fn());

vi.mock("cloudflare:workers", () => ({ env: { AI: { run } } }));

const { decide } = await import("./decide-tools.ts");

const QUESTION = {
  type: "choice",
  instructions: "Which role does snippet s0 play?",
  criteria: { done: "The final result", detail: "An intermediate step" },
} as const;

const INPUT = { snippets: { s0: "完了：PR を作成した。" }, questions: { s0: QUESTION } };

const ANSWER = { answers: { s0: { choice: "done", probabilities: { done: 0.93, detail: 0.07 } } } };

it.effect("sends the snippets and questions to Clef Flash through the gateway", () =>
  Effect.gen(function* sends() {
    run.mockResolvedValueOnce(ANSWER);
    const decided = yield* decide(INPUT);
    expect(decided).toStrictEqual(ANSWER);
    expect(run).toHaveBeenCalledWith(
      "@cf/cloudflare/clef-flash",
      { model: "clef-flash", state: { snippets: INPUT.snippets }, questions: INPUT.questions },
      {
        gateway: {
          id: "default",
          metadata: expect.objectContaining({ caller: "sundries.decide" }),
        },
      },
    );
  }),
);

it.effect("fails when the model answers in another shape", () =>
  Effect.gen(function* malformed() {
    run.mockResolvedValueOnce({ answers: { s0: { probabilities: {} } } });
    const exit = yield* Effect.exit(decide(INPUT));
    expect(Exit.isFailure(exit)).toBe(true);
  }),
);

it("accepts 64 questions and refuses 65", () => {
  const questions = (count: number): Record<string, typeof QUESTION> =>
    Object.fromEntries(
      Array.from({ length: count }, (_, index) => [`q${String(index)}`, QUESTION]),
    );
  const decodes = (count: number): boolean =>
    Schema.decodeUnknownExit(DecideInput)({ snippets: {}, questions: questions(count) })._tag ===
    "Success";
  expect([decodes(64), decodes(65), decodes(0)]).toStrictEqual([true, false, false]);
});

it("refuses a state larger than the model reads", () => {
  const snippets = Object.fromEntries(
    Array.from({ length: 4 }, (_, index) => [`s${String(index)}`, "x".repeat(7000)]),
  );
  const exit = Schema.decodeUnknownExit(DecideInput)({ snippets, questions: { q: QUESTION } });
  expect(exit._tag).toBe("Failure");
});
