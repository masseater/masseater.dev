import { describe, expect, it } from "@effect/vitest";
import { Array, pipe } from "effect";
import { Matrix4 } from "three";

import { beveled } from "./blend-bevel.ts";
import { mirrored, repeated } from "./blend-copies.ts";
import type { Point, Shape } from "./blend-geometry.ts";
import { solidified } from "./blend-solidify.ts";
import { subdivided } from "./blend-subsurf.ts";

const NONE = 0;
const UNIT = 1;
const AWAY = -1;
const HALF = 0.5;
const STEP = 2;
const SQUARE = 4;
const BOX_POINTS = 8;
const BOX_FACES = 6;
const COPIES = 3;
const THICKNESS = 0.1;
const PULL_PARTS = 5;
const PULL_WHOLE = 9;
const DIGITS = 6;
const SMOOTH = { smooth: true, corners: true, creases: true };
const SHAPE_KEYS = { rim: true, shell: true, flip: false, shellMaterial: UNIT, rimMaterial: STEP };

const squarePoints: readonly Point[] = [
  [NONE, NONE, NONE],
  [UNIT, NONE, NONE],
  [UNIT, UNIT, NONE],
  [NONE, UNIT, NONE],
];

const plane: Shape = {
  points: squarePoints,
  faces: [
    {
      vertices: Array.makeBy(SQUARE, (vertex) => vertex),
      uvs: pipe(
        squarePoints,
        Array.flatMap(([across, up]) => [across, up]),
      ),
      material: NONE,
    },
  ],
  edges: [],
};

const box = solidified({ thickness: UNIT, factor: NONE, ...SHAPE_KEYS })(plane);

it("solidifies a plane into a closed box", () => {
  expect(box.points).toHaveLength(BOX_POINTS);
  expect(box.faces).toHaveLength(BOX_FACES);
  expect(box.points[NONE]).toStrictEqual([NONE, NONE, -HALF]);
});

it("subdivides a box with Catmull-Clark", () => {
  const pull = PULL_PARTS / PULL_WHOLE;
  const result = subdivided({ levels: UNIT, rules: SMOOTH })(box);
  expect(result.faces).toHaveLength(BOX_FACES * SQUARE);
  const [across = NONE, up = NONE, depth = NONE] = result.points[NONE] ?? [];
  const pulled = HALF - HALF * pull;
  expect(across).toBeCloseTo(pulled, DIGITS);
  expect(up).toBeCloseTo(pulled, DIGITS);
  expect(depth).toBeCloseTo(-HALF * pull, DIGITS);
});

describe("modifiers", () => {
  it("keeps beveled edges sharp through subdivision", () => {
    const sharp = beveled({ limit: "angle", angle: THICKNESS })(box);
    const result = subdivided({ levels: STEP, rules: SMOOTH })(sharp);
    expect(sharp.edges).toHaveLength(BOX_FACES * STEP);
    expect(result.points.slice(NONE, BOX_POINTS)).toStrictEqual(box.points);
  });

  it("keeps a plane's corners with corner-preserving boundaries", () => {
    const result = subdivided({ levels: STEP, rules: SMOOTH })(plane);
    expect(result.faces).toHaveLength(SQUARE * SQUARE);
    expect(result.points.slice(NONE, SQUARE)).toStrictEqual(squarePoints);
  });

  it("mirrors across an axis", () => {
    const frame = new Matrix4().toArray();
    const base = { axes: [NONE], frame, flipU: false, flipV: false, uvOffset: [], uvShift: [] };
    const result = mirrored(base)(plane);
    expect(result.points).toHaveLength(SQUARE * STEP);
    expect(result.points[SQUARE + UNIT]).toStrictEqual([AWAY, NONE, NONE]);
    expect(result.faces).toHaveLength(STEP);
  });

  it("repeats by an offset", () => {
    const offset = new Matrix4().makeTranslation(STEP, NONE, NONE).toArray();
    const result = repeated({ count: COPIES, offset, uvOffset: [] })(plane);
    expect(result.faces).toHaveLength(COPIES);
    expect(result.points.at(AWAY)).toStrictEqual([STEP * STEP, UNIT, NONE]);
  });

  it("solidifies behind the normal with shell and rim materials", () => {
    const result = solidified({ thickness: THICKNESS, factor: AWAY, ...SHAPE_KEYS })(plane);
    const depths = pipe(
      result.points,
      Array.map((point) => point[STEP]),
    );
    const materials = pipe(
      result.faces,
      Array.map(({ material }) => material),
    );
    expect(new Set(depths)).toStrictEqual(new Set([-THICKNESS, NONE]));
    expect(materials).toStrictEqual([NONE, UNIT, ...Array.replicate(STEP, SQUARE)]);
  });
});
