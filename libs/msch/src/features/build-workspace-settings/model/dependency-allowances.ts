import { Array as Arr, Effect, Option, Record as Rec, Schema } from "effect";

import { literalSettings, usedFrom } from "#/entities/workspace/index.ts";
import type { WorkspaceSource } from "#/entities/workspace/index.ts";

export type DependencySets = Readonly<Record<string, readonly string[]>>;

export interface DependencyAllowance {
  readonly workspaces: readonly string[];
  readonly dependencies: readonly string[];
}

export type DependencyAllowances = Readonly<Record<string, DependencyAllowance>>;

export const MSCH_DEV_DEPENDENCIES = ["msch", "devDependencies"] as const;
export const MSCH_DEPENDENCIES = ["msch", "dependencies"] as const;

const Names = Schema.optional(Schema.Array(Schema.String));
const DependencySettings = Schema.Struct({ use: Names, dependencies: Names });
const WorkspaceDependencyAllowances = Schema.Record(Schema.String, DependencySettings);

const allowanceOf = Effect.fn("allowanceOf")(function* allowanceOf(
  source: WorkspaceSource,
  dependencySets: DependencySets,
  [reason, allowance]: readonly [string, typeof DependencySettings.Type],
) {
  const sets = yield* usedFrom(source.file, dependencySets, allowance.use ?? []);
  const dependencies = [...Arr.flatten(sets), ...(allowance.dependencies ?? [])];
  return [
    `${source.directory}: ${reason}`,
    { workspaces: [source.directory], dependencies },
  ] as const;
});

export const allowancesOf = Effect.fn("allowancesOf")(function* allowancesOf(
  source: WorkspaceSource,
  dependencySets: DependencySets,
  path: typeof MSCH_DEV_DEPENDENCIES | typeof MSCH_DEPENDENCIES,
) {
  const settings = yield* literalSettings({
    source,
    path,
    decode: Schema.decodeUnknownEffect(WorkspaceDependencyAllowances),
  });
  const allowed = Rec.toEntries(Option.getOrElse(settings, () => ({})));
  const entries = yield* Effect.forEach(
    allowed,
    (entry) => allowanceOf(source, dependencySets, entry),
    { concurrency: 1 },
  );
  return Rec.fromEntries(entries);
});
