import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import type { TraitState } from "./trait-state.ts";
import { candidatesOf } from "./trait-vector.ts";

const traitOf = (id: number): TraitState => ({
  key: { existing: id },
  kind: "preference",
  scope: "global",
  statement: "",
  why: "",
  status: "active",
  supersededBy: Option.none(),
  evidence: [],
});

const EAST = 1;
const NORTH = 2;
const WEST = 3;
const UNEMBEDDED = 4;

const NONE = 0;
const UNIT = 1;
const LONG = 100;
const SHORT = 0.01;
const BACK = -1;
const STEEP = 5;

const neighbourhood = {
  traits: [traitOf(EAST), traitOf(NORTH), traitOf(WEST)],
  vectors: {
    "owner_trait:1": [LONG, NONE],
    "owner_trait:2": [NONE, SHORT],
    "owner_trait:3": [BACK, NONE],
  },
};

describe("candidatesOf", () => {
  it("向きの近い順に並べ、ベクトルの長さでは順を変えない", () => {
    const candidates = candidatesOf({
      ...neighbourhood,
      sources: [{ ref: "note:1", vector: [UNIT, STEEP] }],
    });
    expect(candidates).toStrictEqual({
      "note:1": ["owner_trait:2", "owner_trait:1", "owner_trait:3"],
    });
  });

  it("ベクトルの無い特性は候補にしない", () => {
    const candidates = candidatesOf({
      traits: [...neighbourhood.traits, traitOf(UNEMBEDDED)],
      vectors: neighbourhood.vectors,
      sources: [{ ref: "note:1", vector: [UNIT, NONE] }],
    });
    expect(candidates["note:1"]).toStrictEqual(["owner_trait:1", "owner_trait:2", "owner_trait:3"]);
  });
});
