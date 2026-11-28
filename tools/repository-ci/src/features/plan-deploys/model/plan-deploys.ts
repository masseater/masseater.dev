import { writeOutputs } from "@r_masseater/github-workflow";
import { Array as Arr, Config, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import { Stacks, deployed, staged } from "#/entities/deployment/index.ts";
import type { DeploymentRecord } from "#/entities/deployment/index.ts";
import { closure, nameOf, workspace } from "#/entities/workspace/index.ts";
import type { Packages, Tasks } from "#/entities/workspace/index.ts";

import { isChanged } from "./changes.ts";

const WORKFLOWS = [".github/workflows/deploy.yml"];
const CONCURRENCY = 8;

type Stage = Readonly<{
  task: string;
  output: string;
  record: (stack: string) => DeploymentRecord;
}>;

const STAGES: readonly Stage[] = [
  { task: "deploy:bootstrap", output: "bootstrap", record: staged("deploy:bootstrap") },
  { task: "deploy:tailnet", output: "tailnet", record: staged("deploy:tailnet") },
  { task: "deploy:broker", output: "broker", record: staged("deploy:broker") },
  { task: "deploy:zone", output: "zone", record: staged("deploy:zone") },
  { task: "deploy:production", output: "stacks", record: deployed },
];

type Labels = Readonly<Record<string, string>>;

type Stack = Readonly<{ name: string; filter: string; directories: readonly string[] }>;

const dependenciesOf = (task: Tasks[string]): readonly string[] => task.dependsOn ?? [];

const edgesOf = ([id, task]: readonly [string, Tasks[string]]): readonly (readonly [
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

const stageTasks = (tasks: Tasks, task: string): Tasks => {
  const roots = pipe(
    Rec.toEntries(tasks),
    Arr.filter(([, { name }]) => name === task),
    Arr.map(([id]) => id),
  );
  const ids = closure((id: string) => dependenciesOf(tasks[id] ?? { package: id, name: id }))(
    roots,
  );
  return pipe(
    Rec.toEntries(tasks),
    Arr.filter(([id]) => Arr.contains(ids, id)),
    Rec.fromEntries,
  );
};

const changedStacks = Effect.fn("changedStacks")(function* changedStacks(
  stage: Stage,
  { tasks, packages }: Readonly<{ tasks: Tasks; packages: Packages }>,
) {
  const force = yield* Config.Boolean("FORCE").pipe(Config.withDefault(false));
  const isStale = Effect.fn("isStale")(function* isStale(stack: Stack) {
    if (force) {
      return true;
    }
    return yield* isChanged({ packages, record: stage.record, workflows: WORKFLOWS }, stack);
  });
  const changed = yield* Effect.filter(stacksOf(stageTasks(tasks, stage.task)), isStale, {
    concurrency: CONCURRENCY,
  });
  return yield* Schema.encodeEffect(Stacks)(
    pipe(
      changed,
      Arr.map(({ name, filter }) => ({ name, filter })),
    ),
  );
});

/** @internal */
export const planDeploys = Effect.gen(function* planDeploys() {
  const { tasks, packages } = yield* workspace;
  const planned = yield* Effect.forEach(
    STAGES,
    (stage) =>
      changedStacks(stage, { tasks, packages }).pipe(
        Effect.map((stacks) => [stage.output, stacks] as const),
      ),
    { concurrency: 1 },
  );
  yield* writeOutputs(Rec.fromEntries(planned));
});
