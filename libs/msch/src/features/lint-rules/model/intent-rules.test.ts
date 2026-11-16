import { Option, Record, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { INTENTS } from "./intents.ts";
import { mschLintPlugin } from "./plugin.ts";

const ruleNamed = (name: string): Rule =>
  pipe(
    Record.get(mschLintPlugin.rules, name),
    Option.getOrThrowWith(() => new Error(`rule ${name} is missing`)),
  );

const messageOf = (name: string): string =>
  pipe(
    Record.get(INTENTS, name),
    Option.getOrThrowWith(() => new Error(`intent ${name} is missing`)),
  ).message;

const failing = (
  name: string,
  code: string,
): { readonly code: string; readonly errors: [{ readonly message: string }] } => ({
  code,
  errors: [{ message: messageOf(name) }],
});

RuleTester.describe = (text, run): void => {
  describe(text, run);
};
RuleTester.it = (text, run): void => {
  it(text, run);
};

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("ui-state-in-atoms", ruleNamed("ui-state-in-atoms"), {
  valid: [
    'import { useEffect, useRef } from "react";\n',
    'import { useAtom } from "@effect/atom-react";\n',
  ],
  invalid: [
    failing("ui-state-in-atoms", 'import { useState } from "react";\n'),
    failing("ui-state-in-atoms", 'import { useEffect, createContext } from "react";\n'),
    failing("ui-state-in-atoms", 'import * as React from "react";\n'),
  ],
});

tester.run("no-hand-written-sql", ruleNamed("no-hand-written-sql"), {
  valid: ['import { eq } from "drizzle-orm";\n'],
  invalid: [
    failing("no-hand-written-sql", 'import { eq, sql } from "drizzle-orm";\n'),
    failing("no-hand-written-sql", 'import { raw } from "drizzle-orm/sql";\n'),
  ],
});

tester.run("traced-elysia", ruleNamed("traced-elysia"), {
  valid: [
    'import type { Elysia } from "elysia";\n',
    'import { type Elysia, t } from "elysia";\n',
    'import { Elysia } from "@r_masseater/workers-tracing/elysia";\n',
  ],
  invalid: [
    failing("traced-elysia", 'import { Elysia } from "elysia";\n'),
    failing("traced-elysia", 'import Elysia from "elysia";\n'),
  ],
});

tester.run("traced-effect-run", ruleNamed("traced-effect-run"), {
  valid: [
    'import { Effect } from "effect";\nconst program = Effect.succeed(1);\n',
    'import { gen } from "effect/Effect";\n',
  ],
  invalid: [
    failing("traced-effect-run", 'import { Effect } from "effect";\nEffect.runPromise(program);\n'),
    failing("traced-effect-run", 'import { runFork } from "effect/Effect";\n'),
    failing("traced-effect-run", 'import { make } from "effect/ManagedRuntime";\n'),
    failing("traced-effect-run", "const runtime = ManagedRuntime.make(layer);\n"),
    failing("traced-effect-run", 'Effect["runSync"](program);\n'),
  ],
});

tester.run("db-writes-in-writers", ruleNamed("db-writes-in-writers"), {
  valid: ["const rows = db.select().from(table);\n", "store.insert(row);\n"],
  invalid: [
    failing("db-writes-in-writers", "db.insert(table).values(row);\n"),
    failing("db-writes-in-writers", "db.update(table).set(row);\n"),
    failing("db-writes-in-writers", "db.delete(table);\n"),
    failing("db-writes-in-writers", "db.batch([first, second]);\n"),
    failing("db-writes-in-writers", "db.run(statement);\n"),
  ],
});
