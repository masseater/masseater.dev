import { Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { mschLintPlugin } from "./plugin.ts";

const MESSAGE =
  "Collect an async iterable with Array.fromAsync, passing the mapping as its second argument. Do not push each item from a for await loop.";

const rule = pipe(
  Record.get(mschLintPlugin.rules, "array-from-async"),
  Option.getOrThrowWith(() => new Error("rule array-from-async is missing")),
);

const invalid = (
  code: string,
): { readonly code: string; readonly errors: [{ readonly message: string }] } => ({
  code,
  errors: [{ message: MESSAGE }],
});

RuleTester.describe = (text, run): void => {
  describe(text, () => {
    run();
  });
};
RuleTester.it = (text, run): void => {
  it(text, () => {
    run();
  });
};

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "array-from-async",
  rule,
  {
    valid: [
      "const f = async (it: AsyncIterable<string>) => Array.fromAsync(it);\n",
      "const f = async (it: AsyncIterable<number>) => Array.fromAsync(it, (n) => n * 2);\n",
      "async function f(it: AsyncIterable<string>, out: string[]) {\n  for await (const s of it) {\n    out.push(s);\n    log(s);\n  }\n}\n",
      "async function f(it: AsyncIterable<string>, out: string[]) {\n  for await (const s of it) {\n    if (s) out.push(s);\n  }\n}\n",
      "async function f(it: AsyncIterable<string[]>, out: string[]) {\n  for await (const s of it) out.push(...s);\n}\n",
      "async function f(it: AsyncIterable<string>, out: string[]) {\n  for await (const s of it) out.push(s, s);\n}\n",
      "function f(it: Iterable<string>, out: string[]) {\n  for (const s of it) out.push(s);\n}\n",
      "async function f(it: AsyncIterable<string>, out: Queue) {\n  for await (const s of it) out.send(s);\n}\n",
    ],
    invalid: [
      invalid(
        "async function f(it: AsyncIterable<string>) {\n  const out: string[] = [];\n  for await (const s of it) out.push(s);\n  return out;\n}\n",
      ),
      invalid(
        "async function f(it: AsyncIterable<string>) {\n  const out: string[] = [];\n  for await (const s of it) {\n    out.push(s);\n  }\n  return out;\n}\n",
      ),
      invalid(
        "async function f(it: AsyncIterable<{ id: string }>) {\n  const ids: string[] = [];\n  for await (const { id } of it) {\n    ids.push(id.toUpperCase());\n  }\n  return ids;\n}\n",
      ),
      invalid(
        "async function f(it: AsyncIterable<number>, state: { all: number[] }) {\n  for await (const n of it) state.all.push(n);\n}\n",
      ),
    ],
  },
);
