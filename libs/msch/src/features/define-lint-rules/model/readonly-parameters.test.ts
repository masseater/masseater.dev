import { Array as Arr, Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import upstream from "./fixtures/readonly-parameters/upstream.json" with { type: "json" };
import { mschLintPlugin } from "./plugin.ts";

const FIXTURES = new URL("./fixtures/readonly-parameters/", import.meta.url).pathname;
const FILE = `${FIXTURES}file.ts`;
const MESSAGE_ID = "shouldBeReadonly";

const rule = pipe(
  Record.get(mschLintPlugin.rules, "readonly-parameters"),
  Option.getOrThrowWith(() => new Error("rule readonly-parameters is missing")),
);

const accepted = (code: string): RuleTester.ValidTestCase => ({ code, filename: FILE });

const rejected = (code: string, part: string): RuleTester.InvalidTestCase => ({
  code,
  errors: [{ messageId: MESSAGE_ID, data: { part } }],
  filename: FILE,
});

const VENDORED = 'import type { Vendored } from "./vendored.d.ts";\n';

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

const tester = new RuleTester({
  eslintCompat: true,
  languageOptions: { parserOptions: { lang: "ts" } },
});

tester.run("readonly-parameters with the typescript-eslint cases", rule, {
  valid: pipe(upstream.valid, Arr.map(accepted)),
  invalid: pipe(
    upstream.invalid,
    Arr.map(({ code, errors }): RuleTester.InvalidTestCase => ({ code, errors, filename: FILE })),
  ),
});

tester.run("readonly-parameters with types declared outside", rule, {
  valid: [
    accepted(
      'import type { Option } from "effect";\nexport const size = (items: Option.Option<string[]>): number => Number(items._tag.length);\n',
    ),
    accepted(
      'import type { Effect } from "effect";\nexport const run = (effect: Effect.Effect<string[]>): unknown => effect;\n',
    ),
    accepted("export const year = (date: Date): number => date.getFullYear();\n"),
    accepted("export const source = (pattern: RegExp): string => pattern.source;\n"),
    accepted("export const wait = (pending: Promise<string[]>): unknown => pending;\n"),
    accepted("export const size = (bytes: Uint8Array): number => bytes.length;\n"),
    accepted("export const size = (table: ReadonlyMap<string, string[]>): number => table.size;\n"),
    accepted("export const size = (names: ReadonlySet<string>): number => names.size;\n"),
    accepted(`${VENDORED}export const name = (vendored: Vendored): string => vendored.name;\n`),
    accepted(
      `${VENDORED}export const name = (picked: Pick<Vendored, "name">): string => picked.name;\n`,
    ),
    accepted(
      `${VENDORED}export const name = (rest: Omit<Vendored, "tags">): string => rest.name;\n`,
    ),
    accepted(
      `${VENDORED}export const name = (partial: Partial<Vendored>): unknown => partial.name;\n`,
    ),
    accepted(
      `${VENDORED}export const name = (partial: Partial<Pick<Vendored, "name">>): unknown => partial.name;\n`,
    ),
    accepted(
      `${VENDORED}type Named = Pick<Vendored, "name">;\nexport const count = (named: readonly Named[]): number => named.length;\n`,
    ),
    accepted(
      `${VENDORED}interface Mine extends Vendored {\n  readonly extra: string;\n}\nexport const extra = (mine: Mine): string => mine.extra;\n`,
    ),
    accepted(
      `${VENDORED}interface Own {\n  readonly inner: Vendored;\n}\nexport const name = (own: Own): string => own.inner.name;\n`,
    ),
    accepted(
      `${VENDORED}type Tagged = Vendored & { readonly extra: string };\nexport const extra = (tagged: Tagged): string => tagged.extra;\n`,
    ),
    accepted(
      "class Counter {\n  #count = 0;\n  get count(): number {\n    return this.#count;\n  }\n  readonly add = (): void => {\n    this.#count += 1;\n  };\n}\nexport const count = (counter: Counter): number => counter.count;\n",
    ),
    accepted(
      "export const count = <Addon>(names: readonly Extract<keyof Addon, string>[]): number => names.length;\n",
    ),
  ],
  invalid: [
    rejected(
      "export const size = (table: Map<string, string>): number => table.size;\n",
      "the type is a `Map`, which has the read-only form `ReadonlyMap`",
    ),
    rejected(
      "export const size = (names: Set<string>): number => names.size;\n",
      "the type is a `Set`, which has the read-only form `ReadonlySet`",
    ),
    rejected(
      "export const width = (rect: DOMRect): number => rect.width;\n",
      "the type is a `DOMRect`, which has the read-only form `DOMRectReadOnly`",
    ),
    rejected(
      "interface Table extends Map<string, string> {}\nexport const size = (table: Table): number => table.size;\n",
      "the type is a `Map`, which has the read-only form `ReadonlyMap`",
    ),
    rejected(
      "export const size = (names: string[]): number => names.length;\n",
      "the type is a mutable array",
    ),
    rejected(
      "export const first = (pair: [string, string]): string => pair[0];\n",
      "the type is a mutable tuple",
    ),
    rejected(
      "export const size = (record: Record<string, string>): unknown => record;\n",
      "the type has a writable index signature",
    ),
    rejected(
      "interface Own {\n  name: string;\n}\nexport const name = (own: Own): string => own.name;\n",
      "`name` is writable",
    ),
    rejected(
      "interface Own {\n  name: string;\n}\nexport const count = (owns: readonly Own[]): number => owns.length;\n",
      "`[].name` is writable",
    ),
    rejected(
      "interface Own {\n  readonly nested: { readonly list: string[] };\n}\nexport const count = (own: Own): number => own.nested.list.length;\n",
      "`nested.list` is a mutable array",
    ),
    rejected(
      "interface Own {\n  readonly rows: readonly { cell: string }[];\n}\nexport const count = (own: Own): number => own.rows.length;\n",
      "`rows[].cell` is writable",
    ),
    rejected(
      'interface Own {\n  name: string;\n}\nexport const name = (picked: Pick<Own, "name">): string => picked.name;\n',
      "`name` is writable",
    ),
    rejected(
      "export const name = (partial: Partial<{ name: string }>): unknown => partial.name;\n",
      "`name` is writable",
    ),
    rejected(
      "interface Box<Value> {\n  value: Value;\n}\nexport const value = (box: Box<Date>): Date => box.value;\n",
      "`value` is writable",
    ),
    rejected(
      `${VENDORED}interface Mine extends Vendored {\n  extra: string;\n}\nexport const extra = (mine: Mine): string => mine.extra;\n`,
      "`extra` is writable",
    ),
    rejected(
      `${VENDORED}type Tagged = Vendored & { extra: string };\nexport const extra = (tagged: Tagged): string => tagged.extra;\n`,
      "`extra` is writable",
    ),
    rejected(
      `${VENDORED}export const count = (all: Vendored[]): number => all.length;\n`,
      "the type is a mutable array",
    ),
    rejected(
      "class Service {\n  run(): void {}\n}\nexport const run = (service: Service): void => {\n  service.run();\n};\n",
      "`run` is writable",
    ),
  ],
});
