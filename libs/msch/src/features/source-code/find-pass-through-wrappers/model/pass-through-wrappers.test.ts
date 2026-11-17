import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { expect } from "vite-plus/test";

import { typeScriptCompiler, withProject } from "#/entities/project/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { passThroughWrappersIn } from "./pass-through-wrappers.ts";

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const CALLEES = pipe(
  [
    "export const handle = (input: string): string => input;",
    "export const double = (value: number): number => value * 2;",
    "export class Box { constructor(readonly name: string, readonly size: number) {} }",
    "export const logger = { write: (text: string): void => { void text; } };",
    "export const format = (greeting: string, name: string): string => greeting + name;",
    "export const pair = (left: number, right: number): readonly number[] => [left, right];",
    "export const box = (size: number): number => size;",
    "export const parse = <Value>(input: unknown): Value => input as Value;",
    "export const fetchOne = (id: string): Promise<string> => Promise.resolve(id);",
    "export const client = () => ({ send: (body: string): string => body });",
    "export const handler: ((value: number) => number) | undefined = double;",
    "export const looksLikeBox = (value: unknown): boolean => value instanceof Box;",
    "export const listOf = <Item>(item: Item): readonly Item[] => [item];",
    "export const TAG = /</u;",
    "",
  ],
  Arr.join("\n"),
);

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(source: string) {
  const files = yield* RepositoryFiles;
  const tsconfig = yield* stringifyUnknown({
    compilerOptions: {
      strict: true,
      module: "nodenext",
      moduleResolution: "nodenext",
      target: "esnext",
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["src"],
  });
  const root = yield* directoryWith({
    "package.json": '{ "name": "fixture" }',
    "tsconfig.json": tsconfig,
    "src/callees.ts": CALLEES,
    "src/wrappers.ts": source,
  });
  const compiler = yield* typeScriptCompiler;
  const found = yield* withProject({ compiler, root, generated: [] })(
    files.join(root, "tsconfig.json"),
  )((project) =>
    Effect.sync(() =>
      pipe(
        project.sourceFiles,
        Arr.flatMap(passThroughWrappersIn(project.checker)),
        Arr.map((problem) => `${files.relative(root, problem.file)}:${String(problem.line)}`),
      ),
    ),
  );
  return Option.getOrElse(found, (): readonly string[] => []);
}, Effect.scoped);

const IMPORTS =
  'import { Box, TAG, box, client, double, fetchOne, format, handle, handler, listOf, logger, looksLikeBox, pair, parse } from "./callees.ts";';

const reportsFunctionsThatOnlyForwardTheirParameters = Effect.gen(
  function* reportsFunctionsThatOnlyForwardTheirParameters() {
    const findings = yield* findingsFor(
      pipe(
        [
          IMPORTS,
          "export const run = (input: string) => handle(input);",
          "export function make(name: string, size: number) { return new Box(name, size); }",
          "export const largest = (...values: number[]) => Math.max(...values);",
          "export const write = (text: string) => (logger.write(text));",
          "export const twice = function (value: number) { return double(value); };",
          "export const hasTag = (text: string): boolean => TAG.test(text);",
          "export const same = (value: number): number => double(value);",
          "",
        ],
        Arr.join("\n"),
      ),
    );
    expect(findings).toStrictEqual([
      "src/wrappers.ts:2",
      "src/wrappers.ts:3",
      "src/wrappers.ts:4",
      "src/wrappers.ts:5",
      "src/wrappers.ts:6",
      "src/wrappers.ts:7",
      "src/wrappers.ts:8",
    ]);
  },
);

const keepsFunctionsThatChangeTheCall = Effect.gen(function* keepsFunctionsThatChangeTheCall() {
  const findings = yield* findingsFor(
    pipe(
      [
        IMPORTS,
        'export const greet = (name: string) => format("hello", name);',
        "export const flip = (left: number, right: number) => pair(right, left);",
        "export const sized = (size = 1) => box(size);",
        "export const decode = (input: unknown) => parse<string>(input);",
        "export const toInt = (text: string) => Number.parseInt(text);",
        "export const log = (message: string) => console.log(message);",
        "export const load = async (id: string) => fetchOne(id);",
        "export function* each(value: number) { return double(value); }",
        "export const apply = (run: (value: number) => number, value: number) => run(value);",
        "export const stop = (event: { stop: () => void }) => event.stop();",
        "export const send = (body: string) => client().send(body);",
        "export const maybe = (value: number) => handler?.(value);",
        "export function over(value: number): number;",
        "export function over(value: number): number { return double(value); }",
        "export const mapped = [1, 2].map((value) => double(value));",
        "export const api = { run: (value: number) => double(value) };",
        "export function fire(value: number) { double(value); }",
        "export function loop(value: number): number { return loop(value); }",
        "export const isBox = (value: unknown): value is Box => looksLikeBox(value);",
        "export const single = (value: number): readonly number[] => listOf(value);",
        "export const widened = (value: number): number | string => double(value);",
        "",
      ],
      Arr.join("\n"),
    ),
  );
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("pass-through-wrapper", (it) => {
  it.effect(
    "reports functions that only forward their parameters",
    () => reportsFunctionsThatOnlyForwardTheirParameters,
  );
  it.effect("keeps functions that change the call", () => keepsFunctionsThatChangeTheCall);
});
