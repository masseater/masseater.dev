import { describe, expect, it } from "@effect/vitest";
import { Array, HashMap, Order, pipe } from "effect";

import { closure, missingOf } from "./closure.ts";

describe("closure", () => {
  const references = HashMap.make(
    ["prefab", ["material", "mesh", "external"]],
    ["material", ["texture", "shader"]],
    ["mesh", []],
    ["texture", []],
    ["shader", []],
    ["unrelated", []],
  );

  it("follows references inside the package only", () => {
    const included = closure({ roots: ["prefab"], references });
    expect(
      pipe(
        Array.fromIterable(included),
        Array.sortWith((guid) => guid, Order.String),
      ),
    ).toStrictEqual(["material", "mesh", "prefab", "shader", "texture"]);
  });

  it("reports references that the package does not contain", () => {
    const included = closure({ roots: ["prefab"], references });
    expect(missingOf({ included, references })).toStrictEqual(["external"]);
  });
});
