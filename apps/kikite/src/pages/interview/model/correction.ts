import { Array as Arr, Effect, Option, pipe } from "effect";

import { entriesAtom, heardAtom, leadsAtom, summaryAtom, summaryOf } from "#/entities/interview";
import type { Entry, Lead } from "#/entities/interview";
import { requestCorrection } from "#/shared/api";
import { modify, read } from "#/shared/lib/registry";
import type { HeardText, InterviewSummary } from "#protocol";

const heardLine = (entry: Entry): readonly HeardText[] => {
  if (entry.kind === "speech" && entry.by === "voice") {
    return [{ id: entry.id, text: entry.text }];
  }
  return [];
};

const contextOf = (summary: Option.Option<InterviewSummary>, leads: readonly Lead[]): string => {
  const known = Option.match(summary, {
    onNone: Arr.empty<string>,
    onSome: ({ theme, points }) => Arr.prepend(points, theme),
  });
  const topics = pipe(
    leads,
    Arr.map(({ topic }) => topic),
  );
  return pipe(known, Arr.appendAll(topics), Arr.join("\n"));
};

const corrected =
  (lines: readonly HeardText[]) =>
  (entry: Entry): Entry => {
    if (entry.kind !== "speech") {
      return entry;
    }
    return pipe(
      lines,
      Arr.findFirst(({ id, text }) => id === entry.id && text !== entry.text && text !== ""),
      Option.match({
        onNone: () => entry,
        onSome: ({ text }) => ({ ...entry, text, raw: entry.raw ?? entry.text }),
      }),
    );
  };

const pendingLines = Effect.gen(function* pendingLines() {
  const heard = yield* read(heardAtom);
  const entries = yield* read(entriesAtom);
  return pipe(
    entries,
    Arr.filter((entry) => entry.id > heard.correctedThrough),
    Arr.flatMap(heardLine),
  );
});

const contextNow = Effect.gen(function* contextNow() {
  const summary = yield* read(summaryAtom);
  const leads = yield* read(leadsAtom);
  return contextOf(summaryOf(summary), leads);
});

/** @internal */
export const correct = Effect.fn("kikite.correct")(function* correct() {
  const lines = yield* pendingLines;
  const last = Arr.last(lines);
  if (Option.isNone(last)) {
    return;
  }
  yield* modify(heardAtom, (current) => ({ ...current, correctedThrough: last.value.id }));
  const context = yield* contextNow;
  const fixed = yield* requestCorrection({ context, lines }).pipe(
    Effect.orElseSucceed(Arr.empty<HeardText>),
  );
  yield* modify(entriesAtom, Arr.map(corrected(fixed)));
});
