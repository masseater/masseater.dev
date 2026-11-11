import { DateTime, Effect, Option, Schema, pipe } from "effect";

import type { InterviewSetup } from "#protocol";

import { choicesAtom, entriesAtom, settingsAtom, summaryAtom, summaryOf } from "./atoms.ts";
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
    summary: yield* pipe(
      read(summaryAtom),
      Effect.map((state) => Option.getOrNull(summaryOf(state))),
    ),
  };
  const json = yield* encodeJson(record).pipe(Effect.orDie);
  const now = yield* DateTime.now;
  yield* download(json, `kikite-${DateTime.formatIso(now)}.json`);
});

/** @internal */
export { saveRecord };
