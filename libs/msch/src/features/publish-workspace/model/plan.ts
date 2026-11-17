import { outputOf, succeeds, writeOutputs } from "@masseater.dev/github-workflow";
import {
  Array as Arr,
  Config,
  Effect,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { onNpm, requirePublishedDependencies } from "./dependencies.ts";
import {
  environmentOf,
  goesToNpm,
  isRoot,
  isVersioned,
  manifestIn,
  releaseName,
  tagOf,
} from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { buildsOf, checksOf, nativeTargetsOf } from "./platforms.ts";
import { tagged, untaggedVersions } from "./tags.ts";

const HOOK = "release:publish";
const NONE = 0;
const TRAILING_SLASH = /\/$/u;

const Task = Schema.Struct({ package: Schema.String, name: Schema.String });

const TaskGraph = Schema.fromJsonString(
  Schema.Struct({ workspaceRoot: Schema.String, tasks: Schema.Record(Schema.String, Task) }),
);

const Runner = Schema.Struct({ os: Schema.String, runner: Schema.String });

const NativeTarget = Schema.Struct({ target: Schema.String, runner: Schema.String });

const PlanSchema = Schema.Struct({
  directory: Schema.String,
  name: Schema.String,
  version: Schema.String,
  tag: Schema.String,
  environment: Schema.String,
  npm: Schema.Boolean,
  native: Schema.Array(NativeTarget),
  builds: Schema.Array(Runner),
  checks: Schema.Array(Runner),
  release: Schema.Boolean,
  tagged: Schema.Boolean,
  hook: Schema.Boolean,
});

/** @internal */
export type Plan = typeof PlanSchema.Type;

const AssetCount = Schema.fromJsonString(Schema.Finite);

const graphTasks = outputOf({ command: "vp", args: ["run", "--json"] }).pipe(
  Effect.flatMap(Schema.decodeEffect(TaskGraph)),
  Effect.map(({ tasks }) => Rec.values(tasks)),
);

const tasksIn = (tasks: readonly (typeof Task.Type)[], directory: string): readonly string[] =>
  pipe(
    tasks,
    Arr.filter((task) => task.package === directory),
    Arr.map(({ name }) => name),
  );

const workspacesOf = (tasks: readonly (typeof Task.Type)[]): readonly string[] =>
  pipe(
    tasks,
    Arr.map((task) => task.package),
    Arr.dedupe,
  );

const allTagged = Effect.fn("publish.allTagged")(function* allTagged(
  directory: string,
  manifest: Manifest,
) {
  if (!isVersioned(manifest)) {
    return true;
  }
  const current = yield* tagged(tagOf({ directory, ...manifest }));
  const older = yield* untaggedVersions({ directory, manifest });
  return current && Arr.isReadonlyArrayEmpty(older);
});

const workspaceOf = (directory: string): Effect.Effect<string, never, Path.Path> =>
  Path.Path.pipe(Effect.map((path) => Str.replace(TRAILING_SLASH, "")(path.normalize(directory))));

/** @internal */
export const released = Effect.fn("publish.released")(function* released(tag: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  return yield* succeeds({ command: "gh", args: ["release", "view", tag, "--repo", repository] });
});

/** @internal */
export const releasedWithAssets = Effect.fn("publish.releasedWithAssets")(
  function* releasedWithAssets(tag: string) {
    const repository = yield* Config.String("GITHUB_REPOSITORY");
    const view = ["release", "view", tag, "--repo", repository];
    const exists = yield* released(tag);
    if (!exists) {
      return false;
    }
    const count = yield* outputOf({
      command: "gh",
      args: [...view, "--json", "assets", "--jq", ".assets | length"],
    }).pipe(Effect.flatMap(Schema.decodeEffect(AssetCount)));
    return count > NONE;
  },
);

const keepWhen =
  (kept: boolean) =>
  <Item>(items: readonly Item[]): readonly Item[] =>
    pipe(
      items,
      Arr.filter(() => kept),
    );

const needsNpm = Effect.fn("publish.needsNpm")(function* needsNpm(
  directory: string,
  manifest: Manifest,
  workspaces: readonly string[],
) {
  if (!goesToNpm(manifest)) {
    return false;
  }
  const published = yield* onNpm({ directory, ...manifest });
  if (published) {
    return false;
  }
  yield* requirePublishedDependencies({ manifest, workspaces });
  return true;
});

const needsRelease = Effect.fn("publish.needsRelease")(function* needsRelease(
  directory: string,
  manifest: Manifest,
  builds: readonly unknown[],
) {
  const tag = tagOf({ directory, ...manifest });
  if (!isVersioned(manifest)) {
    return false;
  }
  if (isRoot(directory)) {
    return !(yield* released(tag));
  }
  if (Arr.isReadonlyArrayEmpty(builds)) {
    return false;
  }
  return !(yield* releasedWithAssets(tag));
});

const nativeOf = (manifest: Manifest): readonly (typeof NativeTarget.Type)[] =>
  pipe(
    Option.fromUndefinedOr(manifest.native),
    Option.map(({ targets }) => nativeTargetsOf(targets)),
    Option.getOrElse((): readonly (typeof NativeTarget.Type)[] => []),
  );

/** @internal */
export const planOf = Effect.fn("publish.plan")(function* planOf(directory: string) {
  const workspace = yield* workspaceOf(directory);
  const manifest = yield* manifestIn(workspace);
  const graph = yield* graphTasks;
  const tasks = tasksIn(graph, workspace);
  const npm = yield* needsNpm(workspace, manifest, workspacesOf(graph));
  const release = yield* needsRelease(workspace, manifest, buildsOf(tasks));
  const built = keepWhen(release || !isVersioned(manifest));
  const tag = tagOf({ directory: workspace, ...manifest });
  return {
    directory: workspace,
    name: releaseName(manifest),
    version: manifest.version,
    tag,
    tagged: yield* allTagged(workspace, manifest),
    environment: environmentOf(manifest),
    npm,
    native: keepWhen(npm)(nativeOf(manifest)),
    builds: built(buildsOf(tasks)),
    checks: built(checksOf(tasks)),
    release,
    hook: release && Arr.contains(tasks, HOOK),
  } satisfies Plan;
});

/** @internal */
export const writePlan = Effect.fn("publish.writePlan")(function* writePlan(plan: Plan) {
  const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(PlanSchema))(plan);
  yield* Effect.logInfo(encoded);
  yield* writeOutputs({ plan: encoded });
});
