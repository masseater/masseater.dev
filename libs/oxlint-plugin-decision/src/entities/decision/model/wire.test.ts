import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Record as Rec, pipe } from "effect";

import type { DecisionRequest, Question } from "./types.ts";
import { fileRequestsFor, mergeResponses, snippetRequestsFor } from "./wire.ts";

const TIMEOUT = 120_000;
const MODEL = "@cf/cloudflare/clef-flash";
const MAX_QUESTIONS = 64;
const OVER_LIMIT = 65;
const YES = 0.9;
const FIRST = 1;
const REST = 1;

const noul = (instructions: string): Question => ({ type: "noul", instructions });

const refsUpTo = (count: number): readonly string[] =>
  pipe(
    Arr.range(FIRST, count),
    Arr.map((index) => `s${String(index)}`),
  );

const manySnippets = (count: number): DecisionRequest => ({
  model: MODEL,
  state: {
    snippets: Rec.fromEntries(
      pipe(
        refsUpTo(count),
        Arr.map((ref) => [ref, "f()"]),
      ),
    ),
  },
  questions: Rec.fromEntries(
    pipe(
      refsUpTo(count),
      Arr.map((ref) => [ref, noul("Is f risky?")]),
    ),
  ),
});

const twoSnippets: DecisionRequest = {
  model: MODEL,
  state: { snippets: { s0: "f()", s1: "g()" }, contexts: { s0: "file a", s1: "file b" } },
  questions: { s0: noul("Is f risky?"), s1: noul("Is g risky?") },
};

const splitsBySnippet = Effect.sync(() => {
  deepStrictEqual(snippetRequestsFor(twoSnippets), [
    {
      model: MODEL,
      state: { snippets: { s0: "f()" }, contexts: { s0: "file a" } },
      questions: { s0: noul("Is f risky?") },
    },
    {
      model: MODEL,
      state: { snippets: { s1: "g()" }, contexts: { s1: "file b" } },
      questions: { s1: noul("Is g risky?") },
    },
  ]);
});

const chunksLargeRequests = Effect.sync(() => {
  const wires = fileRequestsFor(manySnippets(OVER_LIMIT));
  const sizes = pipe(
    wires,
    Arr.map(({ questions }) => Rec.size(questions)),
  );
  deepStrictEqual(sizes, [MAX_QUESTIONS, REST]);
});

const yes = { type: "noul", noul: YES } as const;

const mergesAnswers = Effect.sync(() => {
  const merged = mergeResponses([
    { model: MODEL, answers: { s0: yes } },
    { model: MODEL, answers: { s1: yes } },
  ]);
  deepStrictEqual(merged, { model: MODEL, answers: { s0: yes, s1: yes } });
});

layer(nodeServices, { excludeTestServices: true })("wire requests", (it) => {
  it.effect("sends one request per snippet", () => splitsBySnippet, TIMEOUT);
  it.effect("splits a file with more than 64 questions", () => chunksLargeRequests, TIMEOUT);
  it.effect("merges the answers of every request", () => mergesAnswers, TIMEOUT);
});
