import { DateTime, Effect, Schema } from "effect";
import { Atom } from "effect/reactivity";

import { read } from "#/shared/lib/registry";
import { SessionRecord } from "#protocol";
import type { RecordedSession } from "#protocol";

import {
  entriesAtom,
  heardAtom,
  progressAtom,
  recordingAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";

const encodeRecord = (record: RecordedSession): Effect.Effect<string> =>
  Schema.encodeEffect(Schema.fromJsonString(SessionRecord))(record).pipe(Effect.orDie);

const download = (json: string, name: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  });

const recordOf = Effect.gen(function* recordOf() {
  const state = yield* read(summaryAtom);
  const record: RecordedSession = {
    startedAt: (yield* read(recordingAtom)).startedAt,
    entries: yield* read(entriesAtom),
    progress: yield* read(progressAtom),
    withdrawn: (yield* read(heardAtom)).withdrawn,
    summary: summaryOf(state),
  };
  return record;
});

const saveRecord = Effect.gen(function* saveRecord() {
  const json = yield* recordOf.pipe(Effect.flatMap(encodeRecord));
  const now = yield* DateTime.now;
  yield* download(json, `kikite-${DateTime.formatIso(now)}.json`);
});

const saveAtom = Atom.fn(() => saveRecord);

/** @internal */
export { encodeRecord, recordOf, saveAtom };
