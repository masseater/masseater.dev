import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { siteTargetsOf } from "./targets.ts";

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
