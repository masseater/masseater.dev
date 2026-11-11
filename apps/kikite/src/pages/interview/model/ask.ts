import { Array as Arr, Clock, Effect, Option, Stream, pipe } from "effect";
import type { HttpClient } from "effect/http";
import type { AtomRegistry } from "effect/reactivity";

import { parseDraft } from "#/pages/interview/lib/draft";
import type { ParsedDraft } from "#/pages/interview/lib/draft";
import { questionText } from "#/shared/api";
import type { QuestionBody } from "#protocol";

import { askingAtom, entriesAtom, heardAtom, summaryAtom, summaryOf } from "./atoms.ts";
import type { Entry } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";
import { askedOf, recentOf } from "./transcript.ts";

type Registered = Effect.Effect<void, never, AtomRegistry.AtomRegistry>;

const IDLE = { status: "idle" } as const;

const bodyNow = Effect.gen(function* bodyNow() {
  const entries = yield* read(entriesAtom);
  const summary = yield* read(summaryAtom);
  const body: QuestionBody = {
    summary: summaryOf(summary),
    recent: recentOf(entries),
    asked: askedOf(entries),
  };
  return body;
});

const pushQuestion = (draft: ParsedDraft): Registered =>
  pipe(
    Clock.currentTimeMillis,
    Effect.flatMap((at) =>
      modify(entriesAtom, (entries) => {
        const entry: Entry = {
          kind: "question",
          id: entries.length,
          at,
          strategy: draft.strategy,
          reason: draft.reason,
          question: draft.question,
          rating: "unrated",
        };
        return Arr.append(entries, entry);
      }),
    ),
  );

const settle = Effect.fn("kikite.settleQuestion")(function* settle(text: string) {
  const draft = parseDraft(text);
  if (Option.isSome(draft.error) || draft.question === "") {
    yield* write(askingAtom, {
      status: "failed",
      message: Option.getOrElse(draft.error, () => text),
    });
    return Option.none<string>();
  }
  yield* pushQuestion(draft);
  yield* write(askingAtom, IDLE);
  return Option.some(draft.question);
});

const streamed = (
  body: QuestionBody,
): Effect.Effect<Option.Option<string>, never, AtomRegistry.AtomRegistry | HttpClient.HttpClient> =>
  questionText(body).pipe(
    Stream.tap((text) => write(askingAtom, { status: "drafting", text })),
    Stream.runLast,
    Effect.flatMap((last) => settle(Option.getOrElse(last, () => ""))),
    Effect.catchTag("InterviewerFailed", ({ message }) =>
      Effect.as(write(askingAtom, { status: "failed", message }), Option.none<string>()),
    ),
    Effect.onInterrupt(() => write(askingAtom, IDLE)),
  );

const ask = Effect.fn("kikite.ask")(function* ask() {
  const asking = yield* read(askingAtom);
  if (asking.status === "drafting") {
    return Option.none<string>();
  }
  yield* write(askingAtom, { status: "drafting", text: "" });
  yield* modify(heardAtom, (heard) => ({ ...heard, spokeSinceQuestion: false }));
  const body = yield* bodyNow;
  return yield* streamed(body);
});

/** @internal */
export { ask };
