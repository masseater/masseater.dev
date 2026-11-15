import { Array, Option, pipe } from "effect";

import {
  dot,
  edgeShiftedBy,
  flipped,
  normalIn,
  normalized,
  pairIn,
  pointIn,
  shiftedBy,
  weighted,
} from "./blend-geometry.ts";
import type { Face, Point, Shape } from "./blend-geometry.ts";

export interface Solidify {
  readonly thickness: number;
  readonly factor: number;
  readonly rim: boolean;
  readonly shell: boolean;
  readonly flip: boolean;
  readonly shellMaterial: number;
  readonly rimMaterial: number;
}

interface Side {
  readonly key: number;
  readonly face: Face;
}

const NONE = 0;
const NEXT = 1;
const HALF = 0.5;
const UNIT = 1;
const AWAY = -1;
const ORIGIN: Point = [NONE, NONE, NONE];

const cornerAngle = (points: readonly Point[], face: Face, at: number): number => {
  const count = face.vertices.length;
  const vertex = (corner: number): Point => pointIn(points)(face.vertices[corner % count] ?? NONE);
  const here = vertex(at);
  const before = normalized(
    weighted([
      [vertex(at + count - NEXT), UNIT],
      [here, AWAY],
    ]),
  );
  const after = normalized(
    weighted([
      [vertex(at + NEXT), UNIT],
      [here, AWAY],
    ]),
  );
  const cosine = Math.min(Math.max(dot([before, after]), AWAY), UNIT);
  return Math.acos(cosine);
};

const normalsOf = (shape: Shape): readonly Point[] => {
  const normals = Array.makeBy(shape.points.length, (): Point => ORIGIN);
  for (const face of shape.faces) {
    const normal = normalIn(shape.points)(face);
    for (const [at, vertex] of face.vertices.entries()) {
      const angle = cornerAngle(shape.points, face, at);
      normals[vertex] = weighted([
        [pointIn(normals)(vertex), UNIT],
        [normal, angle],
      ]);
    }
  }
  return pipe(normals, Array.map(normalized));
};

const sidesOf =
  (total: number) =>
  (face: Face): readonly Side[] =>
    pipe(
      face.vertices,
      Array.map((from, at) => {
        const next = (at + NEXT) % face.vertices.length;
        const to = face.vertices[next] ?? from;
        const key = Math.min(from, to) * total + Math.max(from, to);
        const uvs = [...pairIn(face.uvs)(next), ...pairIn(face.uvs)(at)];
        return { key, face: { vertices: [to, from], uvs, material: face.material } };
      }),
    );

const boundaryOf = (faces: readonly Face[], total: number): readonly Face[] => {
  const uses = new Map<number, number>();
  const sides = pipe(faces, Array.flatMap(sidesOf(total)));
  for (const { key } of sides) {
    uses.set(key, (uses.get(key) ?? NONE) + NEXT);
  }
  return pipe(
    sides,
    Array.filter(({ key }) => uses.get(key) === NEXT),
    Array.map(({ face }) => face),
  );
};

const rimOf =
  (total: number, offset: number) =>
  (side: Face): Face => {
    const [to = NONE, from = NONE] = side.vertices;
    const uv = pairIn(side.uvs);
    return {
      vertices: [to, from, from + total, to + total],
      uvs: [...side.uvs, ...uv(NEXT), ...uv(NONE)],
      material: side.material + offset,
    };
  };

const oriented =
  (flip: boolean) =>
  (face: Face): Face =>
    Option.match(
      Option.liftPredicate(face, () => flip),
      {
        onNone: () => face,
        onSome: flipped,
      },
    );

const shellOf =
  (total: number, solidify: Solidify) =>
  (face: Face): Face =>
    oriented(!solidify.flip)({
      vertices: shiftedBy(total)(face).vertices,
      uvs: face.uvs,
      material: face.material + solidify.shellMaterial,
    });

export const solidified =
  (solidify: Solidify) =>
  (shape: Shape): Shape => {
    const total = shape.points.length;
    const normals = normalsOf(shape);
    const inner = -((-solidify.factor + UNIT) * HALF * solidify.thickness);
    const along =
      (offset: number) =>
      (point: Point, vertex: number): Point =>
        weighted([
          [point, UNIT],
          [pointIn(normals)(vertex), offset],
        ]);
    const original = pipe(shape.faces, Array.map(oriented(solidify.flip)));
    const shell = pipe(shape.faces, Array.map(shellOf(total, solidify)));
    const rims = pipe(
      boundaryOf(shape.faces, total),
      Array.map(rimOf(total, solidify.rimMaterial)),
    );
    return {
      points: [
        ...pipe(shape.points, Array.map(along(inner))),
        ...pipe(shape.points, Array.map(along(solidify.thickness + inner))),
      ],
      faces: [
        ...pipe(
          [...original, ...shell],
          Array.filter(() => solidify.shell),
        ),
        ...pipe(
          rims,
          Array.filter(() => solidify.rim),
        ),
      ],
      edges: [...shape.edges, ...pipe(shape.edges, Array.map(edgeShiftedBy(total)))],
    };
  };
