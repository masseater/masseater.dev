---
name: run-typed-eslint-rules
description: >
  Use when running ESLint rules that need type information inside oxlint with
  @r_masseater/oxlint-typed-rules: the bundled TanStack Start, TanStack Query, TanStack Router,
  Drizzle, Remotion and ESLint React plugins, wrapping another typed ESLint plugin with typedRules,
  writing a typed rule with withTypeInformation, and choosing between this package and
  tsgolint.
metadata:
  type: core
  library: "@r_masseater/oxlint-typed-rules"
  library_version: 0.5.0
sources:
  - src/app/**
  - src/entities/typed-rule/**
  - src/shared/lib/program.ts
  - README.md
---

# run-typed-eslint-rules

Oxlint's JS plugins receive no type information.
This package builds a TypeScript 7 program for each linted file.
It hands the rule the `parserServices` that typed ESLint rules read, without installing ESLint.

## Setup

```sh
npm i -D oxlint @r_masseater/oxlint-typed-rules effect typescript@7
```

Load a bundled plugin through `jsPlugins` and turn its rules on by name.

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    jsPlugins: [
      {
        name: "tanstack-start",
        specifier: "@r_masseater/oxlint-typed-rules/tanstack-start",
      },
    ],
    rules: {
      "tanstack-start/no-async-client-component": "error",
      "tanstack-start/no-client-code-in-server-component": "error",
    },
  },
});
```

| Entry              | Holds                                                   |
| ------------------ | ------------------------------------------------------- |
| `/tanstack-start`  | The two rules of @tanstack/eslint-plugin-start          |
| `/tanstack-query`  | Every rule and config of @tanstack/eslint-plugin-query  |
| `/tanstack-router` | Every rule and config of @tanstack/eslint-plugin-router |
| `/drizzle`         | Every rule and config of eslint-plugin-drizzle          |
| `/remotion`        | Every rule and config of @remotion/eslint-plugin        |
| `/react`           | Every rule and config of @eslint-react/eslint-plugin    |

## Wrap another typed plugin

`typedRules(plugin.rules)` keeps the rules that need type information and gives each one `parserServices`. Export the result as an Oxlint plugin with a `meta.name`.

```ts
import { typedRules } from "@r_masseater/oxlint-typed-rules";

declare const upstream: { readonly rules: Readonly<Record<string, unknown>> };

export default {
  meta: { name: "upstream" },
  rules: typedRules(upstream.rules),
};
```

## Write a typed rule

`withTypeInformation(rule)` gives a rule of your own the same `parserServices`.
`parserServices.program.native` is the TypeScript 7 `Project` of the linted file. Read its `checker` and `program` for what the ESLint-shaped services do not answer.

```ts
import { withTypeInformation } from "@r_masseater/oxlint-typed-rules";

export const noAnyParameter = withTypeInformation({
  meta: { type: "problem", messages: { any: "Give the parameter a type." } },
  create: (context) => {
    const services = context.sourceCode.parserServices;
    if (services === undefined) {
      return {};
    }
    const { checker } = services.program.native;
    return {
      Identifier: (node) => {
        const type = services.getTypeAtLocation(node).native;
        if (checker.typeToString(type) === "any") {
          context.report({ node, messageId: "any" });
        }
      },
    };
  },
});
```

## Choose the tool

A typescript-eslint rule that oxlint also has, such as `no-floating-promises`, runs faster in tsgolint.
Use tsgolint for those, and this package for typed rules that tsgolint does not have.
Running both builds type information twice, so memory grows by that much.

## Common mistakes

A file that no `tsconfig.json` includes gets no program, so the rule reports nothing for it.
ESLint configs do not load as they are. Turn the rules on in the oxlint config.
