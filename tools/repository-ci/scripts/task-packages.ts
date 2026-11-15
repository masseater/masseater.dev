#!/usr/bin/env node
import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Record as Rec, Schema, pipe } from "effect";
import { Argument, Command } from "effect/cli";

import { nameOf, workspace } from "./changes.ts";

const FINALLY = ":finally";

const Packages = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({ name: Schema.String, directory: Schema.String, finally: Schema.Boolean }),
  ),
);

const command = Command.make("task-packages", { task: Argument.String("task") }, ({ task }) =>
  Effect.gen(function* taskPackages() {
    const { tasks } = yield* workspace;
    const defined = Rec.values(tasks);
    const definesIn = (directory: string, name: string): boolean =>
      pipe(
        defined,
        Arr.some((entry) => entry.package === directory && entry.name === name),
      );
    const found = pipe(
      defined,
      Arr.filter(({ name }) => name === task),
      Arr.map(({ package: directory }) => ({
        name: nameOf(directory),
        directory,
        finally: definesIn(directory, `${task}${FINALLY}`),
      })),
    );
    const packages = yield* Schema.encodeEffect(Packages)(found);
    yield* writeOutputs({ packages });
  }),
);

runMain("task-packages")(Command.run(command, { version: "0.0.0" }));
