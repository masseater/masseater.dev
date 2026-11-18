#!/usr/bin/env node
import { Array as Arr, Effect, Order, Schema, Stdio, pipe } from "effect";

import { ProblemsFound, writeStdout } from "#/app/output.ts";
import { runCli } from "#/app/runtime.ts";
import { upstreamExitsMet } from "#/features/check-upstream-exits/index.ts";
import type { FileExit } from "#/features/check-upstream-exits/index.ts";
import { JSON_FLAG } from "#/shared/lib/cli-contract.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const NONE_MET = 0;
const LINE_BREAK = "\n";

const MetRow = Schema.Struct({
  file: Schema.String,
  line: Schema.Finite,
  section: Schema.String,
  key: Schema.String,
  condition: Schema.String,
  outcome: Schema.Literals(["met", "unchecked"]),
});
const MetRows = Schema.fromJsonString(Schema.Array(MetRow));

type MetRowType = typeof MetRow.Type;

const byPlace = Order.Struct({ file: Order.String, line: Order.Number });

const VERDICTS: Readonly<Record<MetRowType["outcome"], string>> = {
  met: "is met. Remove the deviation and run verify.",
  unchecked: "could not be checked. Check it by hand or rerun where the lookup is reachable.",
};

const describeRow = (row: MetRowType): string =>
  `${row.file}:${String(row.line)} ${row.section} ${row.key}: the exit condition ${row.condition} ${VERDICTS[row.outcome]}${LINE_BREAK}`;

const rowsIn = Effect.fn("rowsIn")(function* rowsIn(root: string) {
  const files = yield* RepositoryFiles;
  const met = yield* upstreamExitsMet(root);
  const rows = pipe(
    met,
    Arr.map(({ file, met: { entry, condition, outcome } }: FileExit): MetRowType => ({
      file: files.relative(root, file),
      line: entry.line,
      section: entry.section,
      key: entry.key,
      condition,
      outcome,
    })),
  );
  return Arr.sort(rows, byPlace);
});

const textOf = (
  json: boolean,
  rows: readonly MetRowType[],
): Effect.Effect<string, Schema.SchemaError> => {
  if (json) {
    return Schema.encodeEffect(MetRows)(rows);
  }
  return Effect.succeed(pipe(rows, Arr.map(describeRow), Arr.join("")));
};

const exits = Effect.gen(function* exits() {
  const stdio = yield* Stdio.Stdio;
  const files = yield* RepositoryFiles;
  const args = yield* stdio.args;
  const rows = yield* rowsIn(files.resolve("."));
  const text = yield* textOf(Arr.contains(args, JSON_FLAG), rows);
  yield* writeStdout(text);
  if (rows.length > NONE_MET) {
    return yield* ProblemsFound.make({ count: rows.length });
  }
  return NONE_MET;
});

runCli(exits);
