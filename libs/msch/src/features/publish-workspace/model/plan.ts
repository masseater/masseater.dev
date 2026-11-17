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

import {
  environmentOf,
  goesToNpm,
  isVersioned,
  manifestIn,
  releaseName,
  tagOf,
} from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { buildsOf, checksOf, nativeTargetsOf } from "./platforms.ts";

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
  hook: Schema.Boolean,
});

/** @internal */
export type Plan = typeof PlanSchema.Type;

const AssetCount = Schema.fromJsonString(Schema.Finite);

/** @internal */
export interface Published {
  readonly directory: string;
  readonly name: string;
  readonly version: string;
}

const tasksOf = Effect.fn("publish.tasks")(function* tasksOf(directory: string) {
  const text = yield* outputOf({ command: "vp", args: ["run", "--json"] });
  const graph = yield* Schema.decodeEffect(TaskGraph)(text);
  return pipe(
    Rec.values(graph.tasks),
    Arr.filter((task) => task.package === directory),
    Arr.map(({ name }) => name),
  );
});

/** @internal */
export const onNpm = ({ directory, name, version }: Published): ReturnType<typeof succeeds> =>
  succeeds({ command: "npm", args: ["view", `${name}@${version}`, "version"], cwd: directory });

/** @internal */
export const releasedWithAssets = Effect.fn("publish.releasedWithAssets")(
  function* releasedWithAssets(tag: string) {
    const repository = yield* Config.String("GITHUB_REPOSITORY");
    const view = ["release", "view", tag, "--repo", repository];
    const exists = yield* succeeds({ command: "gh", args: view });
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
) {
  if (!goesToNpm(manifest)) {
    return false;
  }
  const published = yield* onNpm({ directory, ...manifest });
  return !published;
});

const needsRelease = Effect.fn("publish.needsRelease")(function* needsRelease(
  manifest: Manifest,
  builds: readonly unknown[],
) {
  if (!isVersioned(manifest) || Arr.isReadonlyArrayEmpty(builds)) {
    return false;
  }
  const released = yield* releasedWithAssets(tagOf(manifest));
  return !released;
});

const nativeOf = (manifest: Manifest): readonly (typeof NativeTarget.Type)[] =>
  pipe(
    Option.fromUndefinedOr(manifest.native),
    Option.map(({ targets }) => nativeTargetsOf(targets)),
    Option.getOrElse((): readonly (typeof NativeTarget.Type)[] => []),
  );

/** @internal */
export const planOf = Effect.fn("publish.plan")(function* planOf(directory: string) {
  const path = yield* Path.Path;
  const workspace = Str.replace(TRAILING_SLASH, "")(path.normalize(directory));
  const manifest = yield* manifestIn(workspace);
  const tasks = yield* tasksOf(workspace);
  const npm = yield* needsNpm(workspace, manifest);
  const release = yield* needsRelease(manifest, buildsOf(tasks));
  const built = keepWhen(release || !isVersioned(manifest));
  return {
    directory: workspace,
    name: releaseName(manifest),
    version: manifest.version,
    tag: tagOf(manifest),
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
