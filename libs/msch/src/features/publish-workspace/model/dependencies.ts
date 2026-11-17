import { succeeds } from "@masseater.dev/github-workflow";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { goesToNpm, manifestIn } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";

const WORKSPACE_PROTOCOL = "workspace:";
const READ_CONCURRENCY = 8;

/** @internal */
export interface Published {
  readonly directory: string;
  readonly name: string;
  readonly version: string;
}

/** @internal */
export const onNpm = ({ directory, name, version }: Published): ReturnType<typeof succeeds> =>
  succeeds({ command: "npm", args: ["view", `${name}@${version}`, "version"], cwd: directory });

const taggedError = Schema.TaggedError;

/** @internal */
export class UnpublishedDependencies extends taggedError<
  UnpublishedDependencies,
  { readonly brand: unique symbol }
>()("UnpublishedDependencies", { message: Schema.String }) {}

const workspaceDependencies = (manifest: Manifest): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(manifest.dependencies),
    Option.map((dependencies) =>
      pipe(dependencies, Rec.filter(Str.startsWith(WORKSPACE_PROTOCOL)), Rec.keys),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

const failWhenMissing = (
  missing: readonly Published[],
  manifest: Manifest,
): Effect.Effect<void, UnpublishedDependencies> => {
  if (Arr.isReadonlyArrayEmpty(missing)) {
    return Effect.void;
  }
  const names = pipe(
    missing,
    Arr.map(({ directory, name, version }) => `${name}@${version} (${directory})`),
    Arr.join(", "),
  );
  return Effect.fail(
    UnpublishedDependencies.make({
      message: `${manifest.name} depends on versions that are not on npm yet. Publish them first: ${names}`,
    }),
  );
};

/** @internal */
export interface Dependent {
  readonly manifest: Manifest;
  readonly workspaces: readonly string[];
}

/** @internal */
export const requirePublishedDependencies = Effect.fn("publish.dependencies")(
  function* requirePublishedDependencies({ manifest, workspaces }: Dependent) {
    const wanted = workspaceDependencies(manifest);
    const siblings = yield* Effect.forEach(
      workspaces,
      (directory) => manifestIn(directory).pipe(Effect.map((found) => ({ directory, ...found }))),
      { concurrency: READ_CONCURRENCY },
    );
    const internal = pipe(
      siblings,
      Arr.filter((sibling) => Arr.contains(wanted, sibling.name) && goesToNpm(sibling)),
    );
    const missing = yield* Effect.filter(
      internal,
      (sibling) => onNpm(sibling).pipe(Effect.map((published) => !published)),
      { concurrency: READ_CONCURRENCY },
    );
    yield* failWhenMissing(missing, manifest);
  },
);
