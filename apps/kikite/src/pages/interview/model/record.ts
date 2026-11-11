import { DateTime, Effect, Option, Schema, pipe } from "effect";
import { Atom } from "effect/reactivity";

import type { InterviewSetup } from "#protocol";

import {
  choicesAtom,
  entriesAtom,
  heardAtom,
  phaseAtom,
  progressAtom,
  settingsAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
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

const saveRecord = Effect.fn("kikite.saveRecord")(function* saveRecord(setup: InterviewSetup) {
  const record = {
    setup,
    settings: yield* read(settingsAtom),
    entries: yield* read(entriesAtom),
    choices: yield* read(choicesAtom),
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

const saveAtom = Atom.fn(
  Effect.fnUntraced(function* save() {
    const phase = yield* read(phaseAtom);
    if (phase.status !== "setup") {
      yield* saveRecord(phase.setup);
    }
  }),
);

/** @internal */
export { saveAtom };
