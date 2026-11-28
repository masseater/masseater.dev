import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { desktopTargetsOf, siteTargetsOf } from "./targets.ts";

const SEED = 7;

describe("siteTargetsOf", () => {
  it("tests the public hosts as they are and the Access hosts with their token", () => {
    const targets = siteTargetsOf({
      publicHosts: ["a.test"],
      tokens: { "b.test": "secret" },
      seed: SEED,
    });
    expect(
      pipe(
        targets,
        Arr.map(({ origin, bearer }) => [origin, Option.getOrElse(bearer, () => "none")]),
      ),
    ).toStrictEqual([
      ["https://a.test", "none"],
      ["https://b.test", "secret"],
    ]);
  });
});

describe("desktopTargetsOf", () => {
  it("serves each app on its dev URL and mocks the Tauri bridge", () => {
    const targets = desktopTargetsOf({
      apps: [{ name: "a", dir: "/apps/a", command: "vp dev", url: "http://localhost:1420/" }],
      seed: SEED,
    });
    expect(
      pipe(
        targets,
        Arr.map(({ surface, origin, discover }) => [surface, origin, discover]),
      ),
    ).toStrictEqual([["desktop", "http://localhost:1420", false]]);
    expect(
      pipe(
        targets,
        Arr.map(({ init }) => Option.isSome(init)),
      ),
    ).toStrictEqual([true]);
  });
});
