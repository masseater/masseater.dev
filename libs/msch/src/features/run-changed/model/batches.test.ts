import { Array as Arr, Record as Rec, pipe } from "effect";
import { expect, it } from "vite-plus/test";

import { batchesOf } from "./batches.ts";
import type { Unit } from "./units.ts";

const LIMIT = 10;

const unitOf = ([name, sources]: readonly [string, number]): Unit => ({
  name,
  paths: [name],
  key: `key-${name}`,
  sources,
});

const nameOf = ({ name }: Unit): string => name;
const namesIn = Arr.map(nameOf);

const batchesFor = (
  sizes: Readonly<Record<string, number>>,
  limit: number,
): readonly (readonly string[])[] => {
  const units = Arr.map(Rec.toEntries(sizes), unitOf);
  return pipe(batchesOf(units, limit), Arr.map(namesIn));
};

const FITTING = { alpha: 3, bravo: 4 };
const MIXED = { alpha: 2, bravo: 7, charlie: 5, delta: 4, echo: 3 };
const OVERSIZED = { big: 50, alpha: 2, bravo: 3 };
const TIED = { bravo: 5, alpha: 5, charlie: 5 };

it("keeps units in one batch while they fit the limit", () => {
  expect(batchesFor(FITTING, LIMIT)).toStrictEqual([["bravo", "alpha"]]);
});

it("fills the earliest batch that still has room, largest units first", () => {
  expect(batchesFor(MIXED, LIMIT)).toStrictEqual([
    ["bravo", "echo"],
    ["charlie", "delta"],
    ["alpha"],
  ]);
});

it("gives a unit larger than the limit a batch of its own", () => {
  expect(batchesFor(OVERSIZED, LIMIT)).toStrictEqual([["big"], ["bravo", "alpha"]]);
});

it("orders units of the same size by name", () => {
  expect(batchesFor(TIED, LIMIT)).toStrictEqual([["alpha", "bravo"], ["charlie"]]);
});

it("returns no batches for no units", () => {
  expect(batchesFor({}, LIMIT)).toStrictEqual([]);
});
