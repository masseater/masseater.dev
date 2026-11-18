import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { WORKSPACE_SECTIONS, cargoDeviations, workspaceDeviations } from "./deviation-entries.ts";
import type { Deviations } from "./deviation-entries.ts";

const RULE: RuleName = "upstream-deviation-place";
const MANIFEST = "package.json";
const NESTED_WORKSPACE = "/pnpm-workspace.yaml";
const NESTED_CARGO = "/Cargo.toml";
const CARGO_CONFIG = /(?:^|\/)\.cargo\/config(?:\.toml)?$/u;
const MANAGER_FIELDS = ["overrides", "resolutions"] as const;
const START = 0;
const PLACE =
  "Upstream deviations live only in the root pnpm-workspace.yaml (overrides, patchedDependencies, packageExtensions) and the root Cargo.toml ([patch]), each with an exit condition.";

const Fields = Schema.Record(Schema.String, Schema.Unknown);
const Manifest = Schema.fromJsonString(
  Schema.Struct({
    pnpm: Schema.optional(Fields),
    overrides: Schema.optional(Schema.Unknown),
    resolutions: Schema.optional(Schema.Unknown),
  }),
);
const decodeManifest = Schema.decodeUnknownOption(Manifest);

interface Field {
  readonly name: string;
  readonly key: string;
}

const isManifest = (name: string): boolean =>
  name === MANIFEST || Str.endsWith(`/${MANIFEST}`)(name);

const problemAt =
  (entry: Listed, source: string) =>
  (index: number, message: string): Problem => ({
    file: entry.file,
    ...positionOf(source)(index),
    rule: RULE,
    message,
  });

const keyIndex = (source: string, key: string): number =>
  Option.getOrElse(Str.indexOf(`"${key}"`)(source), () => START);

const fieldsIn = (source: string): readonly Field[] =>
  pipe(
    decodeManifest(source),
    Option.match({
      onNone: (): readonly Field[] => [],
      onSome: (manifest) => {
        const pnpm = Option.getOrElse(Option.fromUndefinedOr(manifest.pnpm), () => ({}));
        const pnpmFields = pipe(
          WORKSPACE_SECTIONS,
          Arr.filter((key) => Rec.has(pnpm, key)),
          Arr.map((key) => ({ name: `pnpm.${key}`, key })),
        );
        const managerFields = pipe(
          MANAGER_FIELDS,
          Arr.filter((key) => Option.isSome(Option.fromUndefinedOr(manifest[key]))),
          Arr.map((key) => ({ name: key, key })),
        );
        return [...pnpmFields, ...managerFields];
      },
    }),
  );

const manifestProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    fieldsIn(source),
    Arr.map(({ name, key }) =>
      problemAt(entry, source)(
        keyIndex(source, key),
        `${name} in package.json is not allowed. ${PLACE} Move it there.`,
      ),
    ),
  );

const firstEntryProblem = (
  entry: Listed,
  source: string,
  deviations: Deviations,
): readonly Problem[] =>
  pipe(
    Arr.head(deviations.entries),
    Option.map(({ index }) =>
      problemAt(entry, source)(index, `This file is not read for upstream deviations. ${PLACE}`),
    ),
    Option.toArray,
  );

const problemsIn = (entry: Listed, source: string): readonly Problem[] => {
  if (isManifest(entry.name)) {
    return manifestProblems(entry, source);
  }
  if (Str.endsWith(NESTED_WORKSPACE)(entry.name)) {
    return firstEntryProblem(entry, source, workspaceDeviations(source));
  }
  return firstEntryProblem(entry, source, cargoDeviations(source));
};

const isScanned = ({ name }: Listed): boolean =>
  isManifest(name) ||
  Str.endsWith(NESTED_WORKSPACE)(name) ||
  Str.endsWith(NESTED_CARGO)(name) ||
  CARGO_CONFIG.test(name);

/** @internal */
export const checkScatteredDeviations = Effect.fn("checkScatteredDeviations")(
  function* checkScatteredDeviations(root: string) {
    const listed = yield* listedFiles(root);
    return yield* scanText(pipe(listed, Arr.filter(isScanned)), problemsIn);
  },
);
