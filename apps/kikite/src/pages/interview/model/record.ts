import { Array as Arr, DateTime, Effect, Option, Schema, pipe } from "effect";
import { Atom } from "effect/reactivity";

import { entriesAtom, heardAtom, progressAtom, summaryAtom, summaryOf } from "./atoms.ts";
import type { Entry } from "./atoms.ts";
import { read } from "./registry.ts";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const download = (json: string, name: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  });

const plain = (entry: Entry): Readonly<Record<string, unknown>> => {
  if (entry.kind === "question") {
    return { ...entry, strategy: Option.getOrNull(entry.strategy) };
  }
  return entry;
};

const saveRecord = Effect.gen(function* saveRecord() {
  const entries = yield* read(entriesAtom);
  const record = {
    entries: pipe(entries, Arr.map(plain)),
    progress: yield* read(progressAtom),
    withdrawn: (yield* read(heardAtom)).withdrawn,
    summary: yield* pipe(
      read(summaryAtom),
      Effect.map((state) => Option.getOrNull(summaryOf(state))),
    ),
  };
  const json = yield* encodeJson(record).pipe(Effect.orDie);
  const now = yield* DateTime.now;
  yield* download(json, `kikite-${DateTime.formatIso(now)}.json`);
});

const saveAtom = Atom.fn(() => saveRecord);

/** @internal */
export { saveAtom };
