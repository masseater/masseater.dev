import { readSong } from "@r_masseater/fumx-parser";
import type { SourceIssue } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { compareWithSong } from "#/entities/timeline/index.ts";
import type { Comparison, Written } from "#/entities/timeline/index.ts";

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

export interface Checked extends Written {
  readonly offGrid: number;
}

const issueText = (issue: SourceIssue): string =>
  `${String(issue.line)}:${String(issue.column)} ${issue.message}`;

export const roundTrip = Effect.fn("roundTrip")(function* check(path: string, fumx: Checked) {
  const read = yield* readSong({ path, read: () => Effect.succeed(fumx.text) }).pipe(
    Effect.withSpan("readSong"),
  );
  if (read.status === "invalid") {
    return yield* InvalidOutput.make({
      message: pipe(read.issues, Arr.map(issueText), Arr.join("\n")),
      text: fumx.text,
    });
  }
  const comparison = compareWithSong({ plan: fumx.plan, bars: fumx.bars, song: read.song });
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
