import { layer } from "@effect/vitest";
import { Effect, Array as Arr, pipe } from "effect";
import { expect } from "vite-plus/test";

import { dependencyEntries } from "./dependencies.ts";
import { directoryWith, fixtureLayer } from "./repository.test.support.ts";
import { manifestText } from "./test-manifest.ts";

const EMPTY_DECLARATIONS = "export {};\n";

const namesTypesPackagesByThePackageTheyDescribe = Effect.gen(
  function* namesTypesPackagesByThePackageTheyDescribe() {
    const manifest = yield* manifestText({
      devDependencies: { "@types/node": "26.0.0", "@types/babel__core": "7.0.0" },
    });
    const typesManifest = yield* manifestText({ types: "index.d.ts" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifest,
      "node_modules/@types/node/package.json": typesManifest,
      "node_modules/@types/node/index.d.ts": EMPTY_DECLARATIONS,
      "node_modules/@types/babel__core/package.json": typesManifest,
      "node_modules/@types/babel__core/index.d.ts": EMPTY_DECLARATIONS,
    });
    const entries = yield* dependencyEntries(packageDirectory);
    expect(
      pipe(
        entries,
        Arr.map((entry) => entry.specifier),
      ),
    ).toStrictEqual(["@babel/core", "node"]);
  },
);

layer(fixtureLayer)("dependencyEntries for @types packages", (it) => {
  it.effect(
    "names @types packages by the package they describe",
    () => namesTypesPackagesByThePackageTheyDescribe,
  );
});
