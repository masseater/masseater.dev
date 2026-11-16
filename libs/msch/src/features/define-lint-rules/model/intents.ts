import { Option } from "effect";

import type { Intent } from "./intent-rule.ts";

const RUN_MESSAGE =
  "Run Effects with run or runner from @r_masseater/workers-tracing/effect, so their spans reach the Workers trace.";

const RUN_FUNCTIONS: readonly string[] = [
  "runPromise",
  "runPromiseExit",
  "runFork",
  "runCallback",
  "runSync",
  "runSyncExit",
  "runPromiseWith",
  "runPromiseExitWith",
  "runForkWith",
  "runCallbackWith",
  "runSyncWith",
  "runSyncExitWith",
];

const HAND_WRITTEN_SQL =
  "Build queries with the Drizzle query builder, so that their columns and types come from the schema. Do not write SQL by hand with sql.";

export const INTENTS: Readonly<Record<string, Intent>> = {
  "ui-state-in-atoms": {
    message:
      "Keep UI state in effect-atom (Atom.make, useAtom, useAtomValue), so that state has one home outside the component tree. Do not use React state hooks or context.",
    imports: [
      {
        module: "react",
        names: Option.some(["useState", "useReducer", "createContext", "useContext"]),
        typesAllowed: false,
      },
    ],
    members: [],
  },
  "no-hand-written-sql": {
    message: HAND_WRITTEN_SQL,
    imports: [
      { module: "drizzle-orm", names: Option.some(["sql"]), typesAllowed: false },
      { module: "drizzle-orm/sql", names: Option.none(), typesAllowed: false },
    ],
    members: [],
  },
  "traced-elysia": {
    message:
      "Import Elysia from @r_masseater/workers-tracing/elysia, so every handle call is a span.",
    imports: [{ module: "elysia", names: Option.some(["Elysia", "default"]), typesAllowed: true }],
    members: [],
  },
  "traced-effect-run": {
    message: RUN_MESSAGE,
    imports: [
      { module: "effect/Effect", names: Option.some(RUN_FUNCTIONS), typesAllowed: false },
      { module: "effect/ManagedRuntime", names: Option.some(["make"]), typesAllowed: false },
    ],
    members: [
      { object: "Effect", properties: RUN_FUNCTIONS },
      { object: "ManagedRuntime", properties: ["make"] },
    ],
  },
  "db-writes-in-writers": {
    message:
      "Write tables only from a *-writer.server.ts module, so that a table update and its revision go into the same batch. Call the writer here instead of writing through db.",
    imports: [],
    members: [{ object: "db", properties: ["insert", "update", "delete", "batch", "run"] }],
  },
};
