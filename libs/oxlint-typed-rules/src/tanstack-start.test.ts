import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { Effect, FileSystem, Option, Record, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";
import { RuleTester } from "vite-plus/lint/plugins-dev";

import plugin from "./tanstack-start.ts";

const FIXTURES = {
  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      jsx: "react-jsx",
      module: "preserve",
      moduleResolution: "bundler",
      strict: true,
    },
    files: [
      "stateful-widget.tsx",
      "plain-widget.tsx",
      "render-stateful.tsx",
      "render-plain.tsx",
      "async-note.tsx",
      "client-page.tsx",
      "route.tsx",
    ],
  }),
  "stateful-widget.tsx":
    'import { useState } from "react";\n\nexport const StatefulWidget = () => {\n  const [count] = useState(0);\n  return <p onClick={() => count}>{count}</p>;\n};\n',
  "plain-widget.tsx": "export const PlainWidget = () => <p>plain</p>;\n",
  "render-stateful.tsx":
    'import { renderServerComponent } from "@tanstack/react-start/rsc";\nimport { StatefulWidget } from "./stateful-widget";\n\nexport const render = () => renderServerComponent(<StatefulWidget />);\n',
  "render-plain.tsx":
    'import { renderServerComponent } from "@tanstack/react-start/rsc";\nimport { PlainWidget } from "./plain-widget";\n\nexport const render = () => renderServerComponent(<PlainWidget />);\n',
  "async-note.tsx":
    "export const AsyncNote = async () => {\n  await Promise.resolve();\n  return <p>note</p>;\n};\n",
  "client-page.tsx":
    'import { AsyncNote } from "./async-note";\n\nexport const ClientPage = () => {\n  return <main><AsyncNote /></main>;\n};\n',
  "route.tsx":
    'import { createFileRoute } from "@tanstack/react-router";\nimport { ClientPage } from "./client-page";\n\nexport const Route = createFileRoute("/")({ component: ClientPage });\n',
} as const;

type FixtureName = Exclude<keyof typeof FIXTURES, "tsconfig.json">;

const FIXTURE_DIRECTORY = new URL("../.fixtures/", import.meta.url).pathname;

const writeFixtures = Effect.gen(function* writeFixtures() {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.makeDirectory(FIXTURE_DIRECTORY, { recursive: true });
  yield* Effect.forEach(Record.toEntries(FIXTURES), ([name, code]) =>
    fs.writeFileString(`${FIXTURE_DIRECTORY}${name}`, code),
  );
});

const fixture = (name: FixtureName): Readonly<{ filename: string; code: string }> => ({
  filename: `${FIXTURE_DIRECTORY}${name}`,
  code: FIXTURES[name],
});

const rule = (name: string): Rule =>
  pipe(
    Record.get(plugin.rules, name),
    Option.getOrThrowWith(() => new Error(`rule ${name} is missing`)),
  );

const runImmediately = (_name: string, body: () => void): void => {
  body();
};

const runRuleTests = (
  run: (tester: Readonly<RuleTester>) => void,
): Effect.Effect<void, Effect.Error<typeof writeFixtures>, Effect.Services<typeof writeFixtures>> =>
  writeFixtures.pipe(
    Effect.andThen(
      Effect.sync(() => {
        RuleTester.describe = runImmediately;
        RuleTester.it = runImmediately;
        run(new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }));
      }),
    ),
  );

const flagsClientCodeInServerComponents = runRuleTests((tester) => {
  tester.run("no-client-code-in-server-component", rule("no-client-code-in-server-component"), {
    valid: [fixture("render-plain.tsx"), fixture("plain-widget.tsx")],
    invalid: [
      {
        ...fixture("render-stateful.tsx"),
        errors: [
          { messageId: "hookInServerComponent", line: 4, column: 28 },
          { messageId: "eventHandlerInServerComponent", line: 4, column: 28 },
        ],
      },
    ],
  });
});

const flagsAsyncClientComponents = runRuleTests((tester) => {
  tester.run("no-async-client-component", rule("no-async-client-component"), {
    valid: [fixture("plain-widget.tsx")],
    invalid: [
      {
        ...fixture("client-page.tsx"),
        errors: [{ messageId: "asyncClientComponentUsage", line: 4, column: 15 }],
      },
      {
        ...fixture("async-note.tsx"),
        errors: [{ messageId: "asyncClientComponentDefinition", line: 1, column: 13 }],
      },
    ],
  });
});

layer(NodeServices.layer)("tanstack-start rules with type information", (it) => {
  it.effect(
    "no-client-code-in-server-component flags hooks and handlers",
    () => flagsClientCodeInServerComponents,
  );
  it.effect(
    "no-async-client-component flags async components rendered on the client",
    () => flagsAsyncClientComponents,
  );
});
