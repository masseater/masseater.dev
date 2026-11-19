import { fileURLToPath } from "node:url";

import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Schema, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { webGuidanceRules } from "./web-guidance.config.ts";

const OXLINT = fileURLToPath(new URL("./bin/oxlint", import.meta.resolve("oxlint/package.json")));

const Config = Schema.fromJsonString(Schema.Unknown);

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(source: string) {
  const config = yield* Schema.encodeEffect(Config)({
    plugins: ["jsx-a11y"],
    rules: webGuidanceRules,
  });
  const root = yield* directoryWith({ ".oxlintrc.json": config, "view.tsx": source });
  const handle = yield* ChildProcess.make(
    process.execPath,
    [OXLINT, "--format", "unix", "view.tsx"],
    {
      cwd: root,
      extendEnv: false,
      env: { LANG: "C" },
      stdin: "ignore",
    },
  );
  const [output] = yield* Effect.all(
    [handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return pipe(Str.split(output, "\n"), Arr.filter(Str.includes("jsx-a11y")));
}, Effect.scoped);

const allowsListRoleOnLists = Effect.gen(function* allowsListRoleOnLists() {
  const unordered = yield* findingsIn('export const A = () => <ul role="list"><li>a</li></ul>;\n');
  const ordered = yield* findingsIn('export const A = () => <ol role="list"><li>a</li></ol>;\n');
  expect([...unordered, ...ordered]).toStrictEqual([]);
});

const flagsOtherRedundantRoles = Effect.gen(function* flagsOtherRedundantRoles() {
  const findings = yield* findingsIn('export const A = () => <button role="button">a</button>;\n');
  expect(findings).toStrictEqual([expect.stringContaining("no-redundant-roles")]);
});

const allowsFocusableScrollRegion = Effect.gen(function* allowsFocusableScrollRegion() {
  const findings = yield* findingsIn(
    'export const A = () => <section aria-label="runs" tabIndex={0}><table /></section>;\n',
  );
  expect(findings).toStrictEqual([]);
});

const flagsFocusOnStaticContent = Effect.gen(function* flagsFocusOnStaticContent() {
  const findings = yield* findingsIn("export const A = () => <article tabIndex={0}>a</article>;\n");
  expect(findings).toStrictEqual([expect.stringContaining("no-noninteractive-tabindex")]);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("web guidance lint rules", (it) => {
  it.effect("let unstyled lists restate the list role Safari drops", () => allowsListRoleOnLists);
  it.effect("still report other redundant roles", () => flagsOtherRedundantRoles);
  it.effect("let a labelled table scroll region take focus", () => allowsFocusableScrollRegion);
  it.effect("still keep keyboard focus off static content", () => flagsFocusOnStaticContent);
});
