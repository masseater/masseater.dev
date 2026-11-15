#!/usr/bin/env node
import { mustSucceed, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { Argument, Command } from "effect/cli";

import { nameOf, workspace } from "./lib/changes.ts";
import type { Tasks } from "./lib/changes.ts";

const FINALLY = ":finally";
const ITEMS = ":items";
const ITEMS_OUTPUT = "items=";
const NO_ITEM = "";

const Entry = Schema.Struct({
  name: Schema.String,
  key: Schema.String,
  directory: Schema.String,
  item: Schema.String,
  finally: Schema.Boolean,
});

const Entries = Schema.fromJsonString(Schema.Array(Entry));

const Items = Schema.fromJsonString(Schema.Array(Schema.String));

const definesIn =
  (tasks: Tasks) =>
  (directory: string, name: string): boolean =>
    pipe(
      Rec.values(tasks),
      Arr.some((entry) => entry.package === directory && entry.name === name),
    );

const itemsOutput = (text: string): Option.Option<string> =>
  pipe(
    Str.split(text, "\n"),
    Arr.findLast(Str.startsWith(ITEMS_OUTPUT)),
    Option.map(Str.slice(ITEMS_OUTPUT.length)),
  );

const itemsOf = Effect.fn("itemsOf")(function* itemsOf(
  root: string,
  directory: string,
  task: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const filter = path.relative(path.resolve(), path.join(root, directory));
  const scratch = yield* fileSystem.makeTempDirectoryScoped();
  const output = path.join(scratch, "output");
  yield* fileSystem.writeFileString(output, "");
  yield* mustSucceed({
    command: "vp",
    args: ["run", "--filter", filter, `${task}${ITEMS}`],
    env: { GITHUB_OUTPUT: output },
  });
  const text = yield* fileSystem.readFileString(output);
  return yield* pipe(
    itemsOutput(text),
    Option.match({
      onNone: (): Effect.Effect<readonly string[]> =>
        Effect.die(`${directory} ran ${task}${ITEMS} but wrote no items output`),
      onSome: Schema.decodeEffect(Items),
    }),
  );
});

const entriesOf = Effect.fn("entriesOf")(function* entriesOf(
  { root, tasks }: Readonly<{ root: string; tasks: Tasks }>,
  task: string,
  directory: string,
) {
  const defines = definesIn(tasks);
  const name = nameOf(directory);
  const entryOf = (item: string): typeof Entry.Type => ({
    name,
    key: keyOf(name, item),
    directory,
    item,
    finally: defines(directory, `${task}${FINALLY}`),
  });
  if (defines(directory, `${task}${ITEMS}`)) {
    const items = yield* Effect.scoped(itemsOf(root, directory, task));
    return pipe(items, Arr.map(entryOf));
  }
  return [entryOf(NO_ITEM)];
});

const command = Command.make("task-packages", { task: Argument.String("task") }, ({ task }) =>
  Effect.gen(function* taskPackages() {
    const { workspaceRoot, tasks } = yield* workspace;
    const defining = pipe(
      Rec.values(tasks),
      Arr.filter(({ name }) => name === task),
      Arr.map(({ package: directory }) => directory),
    );
    const found = yield* pipe(
      defining,
      Effect.forEach((directory) => entriesOf({ root: workspaceRoot, tasks }, task, directory)),
    );
    const entries = yield* Schema.encodeEffect(Entries)(Arr.flatten(found));
    yield* writeOutputs({ packages: entries });
  }),
);

runMain("task-packages")(Command.run(command, { version: "0.0.0" }));
