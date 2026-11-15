import { describe, it } from "@effect/vitest";
import { Effect, Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";

import plugin from "./inline-exports.ts";

const MESSAGE =
  "export は宣言に付ける（export const・export function など）。ファイルの末尾で export { … } にまとめない。";

const rule = pipe(
  Record.get(plugin.rules, "inline-exports"),
  Option.getOrThrowWith(() => new Error("rule inline-exports is missing")),
);

const runImmediately = (_name: string, body: () => void): void => {
  body();
};

const invalid = (code: string, output: string | null) => ({
  code,
  output,
  errors: [{ message: MESSAGE }],
});

const checksExportLists = Effect.sync(() => {
  RuleTester.describe = runImmediately;
  RuleTester.it = runImmediately;
  new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
    "inline-exports",
    rule,
    {
      valid: [
        "export const a = 1;\nexport function b() {}\n",
        'export { a } from "./a.ts";\nexport type { B } from "./b.ts";\nexport * from "./c.ts";\n',
        "export {};\n",
        "const a = 1;\nexport default a;\n",
      ],
      invalid: [
        invalid(
          "const a = 1;\nfunction b() {}\nexport { a, b };\n",
          "export const a = 1;\nexport function b() {}\n",
        ),
        invalid(
          "type A = string;\ninterface B {}\nexport type { A, B };\n",
          "export type A = string;\nexport interface B {}\n",
        ),
        invalid(
          "const a = 1;\ntype B = string;\nexport { a, type B };\n",
          "export const a = 1;\nexport type B = string;\n",
        ),
        invalid(
          "function f(x: string): string;\nfunction f(x: unknown) { return x; }\nexport { f };\n",
          "export function f(x: string): string;\nexport function f(x: unknown) { return x; }\n",
        ),
        invalid("const { a, b } = obj;\nexport { a, b };\n", "export const { a, b } = obj;\n"),
        invalid("const { a, b } = obj;\nexport { a };\n", null),
        invalid("const a = 1;\nexport { a as b };\n", null),
        invalid(
          "const a = 1;\nconst c = 2;\nexport { a as b, c };\n",
          "const a = 1;\nexport const c = 2;\nexport { a as b };\n",
        ),
        invalid("class A {}\nexport type { A };\n", null),
        invalid("const a = 1;\nexport { a as default };\n", "const a = 1;\nexport default a;\n"),
        invalid(
          'import { a, b as c } from "./a.ts";\nexport { a, c };\n',
          'export { a, b as c } from "./a.ts";\n',
        ),
        invalid(
          'import { a } from "./a.ts";\nconsole.log(a);\nexport { a };\n',
          'import { a } from "./a.ts";\nconsole.log(a);\nexport { a } from "./a.ts";\n',
        ),
        invalid(
          'import type { A } from "./a.ts";\nexport type { A };\n',
          'export type { A } from "./a.ts";\n',
        ),
        invalid(
          'import d, * as ns from "./a.ts";\nexport { d, ns };\n',
          'export { default as d } from "./a.ts";\nexport * as ns from "./a.ts";\n',
        ),
        invalid(
          "const a = 1;\nconst b = 2;\n\n/** @internal */\nexport { a, b };\n",
          "/** @internal */\nexport const a = 1;\n/** @internal */\nexport const b = 2;\n\n",
        ),
        invalid(
          "/** @internal */\nconst a = 1;\n/** @internal */\nexport { a };\n",
          "/** @internal */\nexport const a = 1;\n",
        ),
        invalid(
          'declare module "m" {\n  const a: number;\n  export { a };\n}\n',
          'declare module "m" {\n  export const a: number;\n}\n',
        ),
      ],
    },
  );
});

describe("inline-exports", () => {
  it.effect("moves local export lists onto their declarations", () => checksExportLists);
});
