import { Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { mschLintPlugin } from "./plugin.ts";

const MESSAGE =
  "Use getOrInsert or getOrInsertComputed on the Map or WeakMap, so that reading a key and storing its first value is one call. Do not read the key and then set it by hand.";

const rule = pipe(
  Record.get(mschLintPlugin.rules, "get-or-insert"),
  Option.getOrThrowWith(() => new Error("rule get-or-insert is missing")),
);

const invalid = (
  code: string,
): { readonly code: string; readonly errors: [{ readonly message: string }] } => ({
  code,
  errors: [{ message: MESSAGE }],
});

RuleTester.describe = (text, run): void => {
  describe(text, run);
};
RuleTester.it = (text, run): void => {
  it(text, run);
};

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run("get-or-insert", rule, {
  valid: [
    "const f = (m: Map<string, number[]>, k: string) => m.getOrInsertComputed(k, () => []);\n",
    "function f(m: Map<string, number>, k: string) {\n  const n = m.get(k) ?? 0;\n  m.set(k, n + 1);\n}\n",
    "function f(m: Map<string, number>, k: string) {\n  if (!m.has(k)) {\n    m.set(k, 1);\n    log(k);\n  }\n}\n",
    "function f(m: Map<string, number>, k: string) {\n  if (!m.has(k)) {\n    m.set(k, 1);\n  } else {\n    log(k);\n  }\n}\n",
    "function f(m: Map<string, Entry>, k: string) {\n  const c = m.get(k);\n  if (c !== undefined && c.fresh) return c;\n  const n = load(k);\n  m.set(k, n);\n  return n;\n}\n",
    "const f = (m: Map<string, boolean>, k: string) =>\n  pipe(\n    Option.fromNullishOr(m.get(k)),\n    Option.getOrElse(() => {\n      m.set(k, false);\n      const r = compute(k);\n      m.set(k, r);\n      return r;\n    }),\n  );\n",
    "function f(m: Map<string, number>, k: string, v: number) {\n  m.set(k, v);\n  return v;\n}\n",
    "function f(m: Map<string, P>, k: string) {\n  const p = m.get(k) ?? make(k);\n  m.delete(k);\n  m.set(k, p);\n  return p;\n}\n",
    "const f = (m: Map<string, number>, k: string) =>\n  Option.fromNullishOr(m.get(k)).pipe(\n    Option.getOrElse(() => {\n      if (!top(k)) {\n        return fail(k);\n      }\n      const v = compute(k);\n      m.set(k, v);\n      return v;\n    }),\n  );\n",
  ],
  invalid: [
    invalid(
      "function f(m: Map<string, number[]>, k: string, v: number) {\n  const group = m.get(k) ?? [];\n  group.push(v);\n  m.set(k, group);\n}\n",
    ),
    invalid(
      "function f(m: Map<string, number>, k: string) {\n  if (!m.has(k)) {\n    m.set(k, 1);\n  }\n}\n",
    ),
    invalid(
      "function f(m: Map<string, number>, k: string) {\n  const cached = m.get(k);\n  if (cached !== undefined) {\n    return cached;\n  }\n  const fresh = compute(k);\n  m.set(k, fresh);\n  return fresh;\n}\n",
    ),
    invalid(
      "function f(m: WeakMap<object, Set<string>>, k: object) {\n  const found = Option.fromNullishOr(m.get(k));\n  if (Option.isSome(found)) {\n    return found.value;\n  }\n  const created = new Set<string>();\n  m.set(k, created);\n  return created;\n}\n",
    ),
    invalid(
      "const f = (m: Map<number, Plan>, k: number) =>\n  Option.getOrElse(Option.fromUndefinedOr(m.get(k)), () => {\n    const plan = planFor(k);\n    m.set(k, plan);\n    return plan;\n  });\n",
    ),
    invalid(
      "const f = (m: WeakMap<object, number>, k: object) =>\n  Option.fromNullishOr(m.get(k)).pipe(\n    Option.getOrElse(() => {\n      const computed = compute(k);\n      m.set(k, computed);\n      return computed;\n    }),\n  );\n",
    ),
  ],
});
