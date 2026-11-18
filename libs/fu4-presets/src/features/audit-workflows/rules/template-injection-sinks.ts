import { Array as Arr, Option, Result, Schema, pipe } from "effect";

import { annotated, keyOnly, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { parsePattern, patternMatches, usesRef } from "#/features/audit-workflows/lib/uses.ts";
import type { UsesPattern } from "#/features/audit-workflows/lib/uses.ts";
import type { EnvValue, RepositoryUses } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";
import codeqlSinks from "#/shared/data/zizmor/codeql-injection-sinks.json" with { type: "json" };

const EXTRA_SINKS: readonly (readonly [string, readonly string[]])[] = [
  ["amadevus/pwsh-script", ["script"]],
  ["jannekem/run-python-script-action", ["script"]],
  ["cardinalby/js-eval-action", ["expression"]],
  ["addnab/docker-run-action", ["options", "run"]],
];

const SinkTable = Schema.Array(Schema.Tuple([Schema.String, Schema.Array(Schema.String)]));

const CODEQL_SINKS = Result.getOrThrow(Schema.decodeUnknownResult(SinkTable)(codeqlSinks));

const sinkOf = ([pattern, inputs]: readonly [string, readonly string[]]): readonly [
  UsesPattern,
  readonly string[],
] => [Result.getOrThrow(parsePattern(pattern)), inputs];

const SINKS: readonly (readonly [UsesPattern, readonly string[]])[] = pipe(
  [...CODEQL_SINKS, ...EXTRA_SINKS],
  Arr.map(sinkOf),
);

export interface Script {
  readonly text: string;
  readonly location: SymbolicLocation;
  readonly related: readonly SymbolicLocation[];
}

const sinksOf = (uses: RepositoryUses): readonly string[] =>
  pipe(
    Arr.findFirst(SINKS, ([pattern]) => patternMatches(pattern)(usesRef(uses))),
    Option.match({ onNone: () => [], onSome: ([, inputs]) => inputs }),
  );

const stringInput =
  (inputs: ReadonlyMap<string, EnvValue>) =>
  (input: string): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(inputs.get(input)),
      Option.flatMap((value) => {
        if (value.type === "string") {
          return Option.some(value.value);
        }
        return Option.none();
      }),
    );

export const scriptsOf = (view: StepView): readonly Script[] => {
  const { body, location } = view;
  if (body.type === "run") {
    return [
      {
        text: body.run,
        location: withKeys("run")(location),
        related: [keyOnly(annotated("this run block")(withKeys("run")(location)))],
      },
    ];
  }
  if (body.uses.type !== "repository" || body.with.type !== "literal") {
    return [];
  }
  const inputs = body.with.value;
  return pipe(
    sinksOf(body.uses),
    Arr.flatMap((input) =>
      pipe(
        stringInput(inputs)(input),
        Option.map((text) => ({
          text,
          location: withKeys("with", input)(location),
          related: [
            annotated("action accepts arbitrary code")(withKeys("uses")(location)),
            keyOnly(annotated("via this input")(withKeys("with", input)(location))),
          ],
        })),
        Option.toArray,
      ),
    ),
  );
};
