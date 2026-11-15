#!/usr/bin/env node
import { outputOf, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

const TASK = "deploy:production";

const Task = Schema.Struct({
  package: Schema.String,
  dependsOn: Schema.optionalKey(Schema.Array(Schema.String)),
});

const Plan = Schema.fromJsonString(Schema.Struct({ plan: Schema.Record(Schema.String, Task) }));

const Stacks = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ name: Schema.String, filters: Schema.String })),
);

type Tasks = (typeof Plan.Type)["plan"];

type Labels = Readonly<Record<string, string>>;

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

const nameOf = (directory: string): string =>
  pipe(
    Str.split(directory, "/"),
    Arr.last,
    Option.getOrElse(() => directory),
  );

const stacksOf = (tasks: Tasks): typeof Stacks.Type => {
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
        filters: pipe(
          roots,
          Arr.map((directory) => `--filter=./${directory}`),
          Arr.join(" "),
        ),
      };
    }),
  );
};

runMain("deploy-stacks")(
  Effect.gen(function* deployStacks() {
    const json = yield* outputOf({
      command: "vp",
      args: ["run", "--dry-run", "--json", "-r", TASK],
    });
    const { plan } = yield* Schema.decodeEffect(Plan)(json);
    const stacks = yield* Schema.encodeEffect(Stacks)(stacksOf(plan));
    yield* writeOutputs({ stacks });
  }),
);
