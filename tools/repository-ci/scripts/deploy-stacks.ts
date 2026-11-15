#!/usr/bin/env node
import { outputOf, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import { isChanged, nameOf, workspace } from "./changes.ts";
import { deployed } from "./deployment.ts";

const TASK = "deploy:production";
const WORKFLOWS = [".github/workflows/deploy.yml"];

const Task = Schema.Struct({
  package: Schema.String,
  dependsOn: Schema.optionalKey(Schema.Array(Schema.String)),
});

const Plan = Schema.fromJsonString(Schema.Struct({ plan: Schema.Record(Schema.String, Task) }));

const Stacks = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ name: Schema.String, filter: Schema.String })),
);

type Tasks = (typeof Plan.Type)["plan"];

type Labels = Readonly<Record<string, string>>;

type Stack = Readonly<{ name: string; filter: string; directories: readonly string[] }>;

const dependenciesOf = (task: typeof Task.Type): readonly string[] => task.dependsOn ?? [];

const edgesOf = ([id, task]: readonly [string, typeof Task.Type]): readonly (readonly [
  string,
  string,
])[] =>
  pipe(
    dependenciesOf(task),
    Arr.map((dependency) => [id, dependency] as const),
  );

const relabel =
  (from: string, to: string) =>
  (label: string): string =>
    pipe(
      label,
      Option.liftPredicate((current) => current === from),
      Option.as(to),
      Option.getOrElse(() => label),
    );

const joined = (labels: Labels, [left, right]: readonly [string, string]): Labels =>
  pipe(labels, Rec.map(relabel(labels[right] ?? right, labels[left] ?? left)));

const stacksOf = (tasks: Tasks): readonly Stack[] => {
  const ids = Rec.keys(tasks);
  const needed = pipe(Rec.values(tasks), Arr.flatMap(dependenciesOf));
  let labels: Labels = Rec.fromIterableWith(ids, (id) => [id, id]);
  for (const edge of Arr.flatMap(Rec.toEntries(tasks), edgesOf)) {
    labels = joined(labels, edge);
  }
  const directoryOf = (id: string): readonly string[] =>
    pipe(
      Option.fromNullishOr(tasks[id]),
      Option.map(({ package: directory }) => directory),
      Option.toArray,
    );
  return pipe(
    Arr.groupBy(ids, (id) => labels[id] ?? id),
    Rec.values,
    Arr.map((members) => {
      const roots = pipe(
        members,
        Arr.filter((id) => !Arr.contains(needed, id)),
        Arr.flatMap(directoryOf),
      );
      return {
        name: pipe(roots, Arr.map(nameOf), Arr.join("+")),
        filter: pipe(
          roots,
          Arr.map((directory) => `./${directory}`),
          Arr.join(" "),
        ),
        directories: pipe(members, Arr.flatMap(directoryOf)),
      };
    }),
  );
};

runMain("deploy-stacks")(
  Effect.gen(function* deployStacks() {
    const plan = yield* outputOf({
      command: "vp",
      args: ["run", "--dry-run", "--json", "-r", TASK],
    }).pipe(Effect.flatMap(Schema.decodeEffect(Plan)));
    const { packages } = yield* workspace;
    const changed = yield* Effect.filter(stacksOf(plan.plan), (stack) =>
      isChanged({ packages, record: deployed, workflows: WORKFLOWS }, stack),
    );
    const stacks = yield* Schema.encodeEffect(Stacks)(
      pipe(
        changed,
        Arr.map(({ name, filter }) => ({ name, filter })),
      ),
    );
    yield* writeOutputs({ stacks });
  }),
);
