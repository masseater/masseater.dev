import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, FileSystem, Option, Path, Predicate, Record as Rec, pipe } from "effect";
import { expect } from "vite-plus/test";

import { readSection } from "./cli.ts";

interface Failed {
  readonly message: string;
}

const source = {
  name: "sample",
  section: (config: unknown): string =>
    pipe(
      Option.liftPredicate(config, Predicate.hasProperty("sample")),
      Option.map((value) => value.sample),
      Option.filter(Predicate.isString),
      Option.getOrElse(() => "missing"),
    ),
  failWith: (message: string) => (): Failed => ({ message }),
};

const sectionIn = Effect.fn("sectionIn")(function* sectionIn(
  files: Readonly<Record<string, string>>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "lint-host-" });
  yield* Effect.forEach(
    Rec.toEntries(files),
    ([name, text]) => fileSystem.writeFileString(path.join(root, name), text),
    { concurrency: 1, discard: true },
  );
  return yield* readSection(source, root);
});

const readsTypeScript = Effect.gen(function* readsTypeScript() {
  const section = yield* sectionIn({
    "vite.config.ts": "export default { sample: 'ts' };\n",
  });
  expect(section).toBe("ts");
}).pipe(Effect.scoped);

const readsJavaScript = Effect.gen(function* readsJavaScript() {
  const section = yield* sectionIn({ "vite.config.mjs": "export default { sample: 'mjs' };\n" });
  expect(section).toBe("mjs");
}).pipe(Effect.scoped);

const prefersTypeScript = Effect.gen(function* prefersTypeScript() {
  const section = yield* sectionIn({
    "vite.config.ts": "export default { sample: 'ts' };\n",
    "vite.config.js": "export default { sample: 'js' };\n",
  });
  expect(section).toBe("ts");
}).pipe(Effect.scoped);

const passesEmptyConfig = Effect.gen(function* passesEmptyConfig() {
  const section = yield* sectionIn({});
  expect(section).toBe("missing");
}).pipe(Effect.scoped);

const failsOnBrokenConfig = Effect.gen(function* failsOnBrokenConfig() {
  const { message } = yield* Effect.flip(sectionIn({ "vite.config.ts": "export default {;\n" }));
  expect(message).toMatch(/^could not load .*vite\.config\.ts$/u);
}).pipe(Effect.scoped);

layer(nodeServicesLayer)("readSection", (it) => {
  it.effect("reads its section from vite.config.ts", () => readsTypeScript);
  it.effect("reads vite.config.mjs without a TypeScript config", () => readsJavaScript);
  it.effect("prefers vite.config.ts over JavaScript configs", () => prefersTypeScript);
  it.effect("hands an empty config to the section without a file", () => passesEmptyConfig);
  it.effect("fails through failWith when the config cannot load", () => failsOnBrokenConfig);
});
