import { Array as Arr, Effect, Schema, pipe } from "effect";

import { compareWithMidi, midiToFumx } from "#/features/convert-midi/index.ts";
import type { Comparison, MidiFile } from "#/features/convert-midi/index.ts";
import { readSong } from "#/features/read-song/index.ts";
import type { SourceIssue } from "#/features/read-song/index.ts";

const taggedError = Schema.TaggedError;

export class InvalidOutput extends taggedError<InvalidOutput, { readonly brand: unique symbol }>()(
  "InvalidOutput",
  { message: Schema.String, text: Schema.String },
  { identifier: "InvalidOutput" },
) {}

export interface Adjustments {
  readonly offGrid: number;
}

export interface Converted {
  readonly text: string;
  readonly comparison: Comparison;
  readonly adjustments: Adjustments;
}

export interface MidiSource extends MidiFile {
  readonly path: string;
}

const issueText = (issue: SourceIssue): string =>
  `${String(issue.line)}:${String(issue.column)} ${issue.message}`;

export const convertMidiFile = Effect.fn("convertMidiFile")(function* convert(source: MidiSource) {
  const fumx = yield* midiToFumx(source);
  const read = yield* readSong({ path: source.path, read: () => Effect.succeed(fumx.text) }).pipe(
    Effect.withSpan("readSong"),
  );
  if (read.status === "invalid") {
    return yield* InvalidOutput.make({
      message: pipe(read.issues, Arr.map(issueText), Arr.join("\n")),
      text: fumx.text,
    });
  }
  const comparison = compareWithMidi({ plan: fumx.plan, bars: fumx.bars, song: read.song });
  yield* Effect.annotateCurrentSpan({
    matches: comparison.matches,
    notes: comparison.notes.expected,
  });
  const converted: Converted = {
    text: fumx.text,
    comparison,
    adjustments: { offGrid: fumx.offGrid },
  };
  return converted;
});
