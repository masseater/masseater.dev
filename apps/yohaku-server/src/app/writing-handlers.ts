import { failed } from "@masseater.dev/local-server";
import type { RequestFailed } from "@masseater.dev/local-server";
import { Array, Effect, Option, Stream, pipe } from "effect";
import type { SqlClient } from "effect/sql";

import { draftFromMemo, rewriteSpan } from "#features/draft";
import { remarksOf } from "#features/remarks";
import type { Agent } from "#shared/agent";

import { paragraphOf } from "./annotation-handlers.ts";
import type { Handlers } from "./handler-types.ts";
import { failedStream } from "./request-failed.ts";
import { contextFor } from "./understanding.ts";

interface Target {
  readonly id: string;
  readonly paragraphId: string;
}

interface SpanTarget extends Target {
  readonly from: number;
  readonly to: number;
  readonly rule: string;
}

type Writing = Stream.Stream<string, RequestFailed, Agent | SqlClient.SqlClient>;

const problemOf = Effect.fn("problemOf")(function* problemOf(target: SpanTarget) {
  const paragraph = yield* paragraphOf(target);
  const problem = pipe(
    remarksOf([paragraph]),
    Array.findFirst(({ rule }) => rule === target.rule),
    Option.match({ onNone: () => target.rule, onSome: ({ message }) => message }),
  );
  return { paragraph, problem };
});

const drafting = Effect.fn("drafting")(function* drafting(target: Target) {
  const context = yield* failed(contextFor(target.id));
  const memo = yield* failed(paragraphOf(target));
  return failedStream(draftFromMemo({ context, memo }));
});

const rewriting = Effect.fn("rewriting")(function* rewriting(target: SpanTarget) {
  const context = yield* failed(contextFor(target.id));
  const { paragraph, problem } = yield* failed(problemOf(target));
  const { from, to } = target;
  return failedStream(rewriteSpan({ context, paragraph, from, to, problem }));
});

const draft = (target: Target): Writing => Stream.unwrap(drafting(target));

const rewrite = (target: SpanTarget): Writing => Stream.unwrap(rewriting(target));

/** @internal */
const writingHandlers = {
  DraftFromMemo: draft,
  RewriteRemark: rewrite,
} satisfies Pick<Handlers, "DraftFromMemo" | "RewriteRemark">;

export { writingHandlers };
