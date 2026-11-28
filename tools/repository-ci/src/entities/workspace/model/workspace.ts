import { outputOf } from "@r_masseater/github-workflow";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

const Package = Schema.Struct({
  dependencies: Schema.String.pipe(Schema.Array, Schema.optionalKey),
  devDependencies: Schema.String.pipe(Schema.Array, Schema.optionalKey),
});

const Task = Schema.Struct({
  package: Schema.String,
  name: Schema.String,
  dependsOn: Schema.String.pipe(Schema.Array, Schema.optionalKey),
});

/** @internal */
export const Workspace = Schema.fromJsonString(
  Schema.Struct({
    workspaceRoot: Schema.String,
    packages: Schema.Record(Schema.String, Package),
    tasks: Schema.Record(Schema.String, Task),
  }),
);

/** @internal */
export type Packages = (typeof Workspace.Type)["packages"];

/** @internal */
export type Tasks = (typeof Workspace.Type)["tasks"];

/** @internal */
export const workspace = outputOf({ command: "vp", args: ["run", "--json"] }).pipe(
  Effect.flatMap(Schema.decodeEffect(Workspace)),
);

/** @internal */
export const neighborsIn =
  (packages: Packages) =>
  (directory: string): readonly string[] => {
    const { dependencies = [], devDependencies = [] } = packages[directory] ?? {};
    return [...dependencies, ...devDependencies];
  };

/** @internal */
export const closure =
  (neighbors: (node: string) => readonly string[]) =>
  (start: readonly string[]): readonly string[] => {
    const seen = new Set(start);
    const queue = [...start];
    for (const node of queue) {
      const unseen = pipe(
        neighbors(node),
        Arr.filter((candidate) => !seen.has(candidate)),
      );
      for (const candidate of unseen) {
        seen.add(candidate);
        queue.push(candidate);
      }
    }
    return [...seen];
  };

/** @internal */
export const nameOf = (directory: string): string =>
  pipe(
    Str.split(directory, "/"),
    Arr.last,
    Option.getOrElse(() => directory),
  );
