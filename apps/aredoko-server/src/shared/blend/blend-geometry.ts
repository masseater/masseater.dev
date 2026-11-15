import { Array, Option, pipe } from "effect";

import type { Edge } from "./blend-edges.ts";
import type { MeshData } from "./blend-mesh.ts";

type Point = readonly [across: number, up: number, depth: number];

type Term = readonly [point: Point, weight: number];

interface Face {
  readonly vertices: readonly number[];
  readonly uvs: readonly number[];
  readonly material: number;
}

interface Shape {
  readonly points: readonly Point[];
  readonly faces: readonly Face[];
  readonly edges: readonly Edge[];
}

const XYZ = 3;
const UV = 2;
const NONE = 0;
const NEXT = 1;
const ORIGIN: Point = [NONE, NONE, NONE];

const weighted = (terms: readonly Term[]): Point => {
  const total = [NONE, NONE, NONE];
  for (const [point, weight] of terms) {
    for (const [axis, value] of point.entries()) {
      total[axis] = (total[axis] ?? NONE) + value * weight;
    }
  }
  const [first = NONE, second = NONE, third = NONE] = total;
  return [first, second, third];
};

const mean = (points: readonly Point[]): Point => {
  const weight = NEXT / Math.max(points.length, NEXT);
  return weighted(
    pipe(
      points,
      Array.map((point): Term => [point, weight]),
    ),
  );
};

const cross = ([[ax, ay, az], [bx, by, bz]]: readonly [Point, Point]): Point => [
  ay * bz - az * by,
  az * bx - ax * bz,
  ax * by - ay * bx,
];

const dot = ([[ax, ay, az], [bx, by, bz]]: readonly [Point, Point]): number =>
  ax * bx + ay * by + az * bz;

const normalized = (point: Point): Point => {
  const size = Math.sqrt(dot([point, point]));
  return Option.match(
    Option.liftPredicate(size, (length) => length > NONE),
    { onNone: () => ORIGIN, onSome: (length) => weighted([[point, NEXT / length]]) },
  );
};

const pointIn =
  (points: readonly Point[]) =>
  (vertex: number): Point =>
    Option.getOrElse(Array.get(points, vertex), () => ORIGIN);

const pairIn =
  (values: readonly number[]) =>
  (index: number): readonly number[] =>
    values.slice(index * UV, index * UV + UV);

const meanUv = (pairs: readonly (readonly number[])[]): readonly number[] => {
  const usable = pipe(
    pairs,
    Array.filter((pair) => pair.length === UV),
  );
  const terms = pipe(
    usable,
    Array.map(([first = NONE, second = NONE]): Term => [[first, second, NONE], NEXT]),
  );
  const [first, second] = weighted(terms);
  const total = Math.max(usable.length, NEXT);
  return Array.match(usable, {
    onEmpty: () => [],
    onNonEmpty: () => [first / total, second / total],
  });
};

const edgeShiftedBy =
  (by: number) =>
  (edge: Edge): Edge => ({
    from: edge.from + by,
    to: edge.to + by,
    crease: edge.crease,
    weight: edge.weight,
  });

const flipped = (face: Face): Face => {
  const rest = Array.makeBy(face.vertices.length, (at) => at).slice(NEXT);
  const order = [NONE, ...Array.reverse(rest)];
  return {
    vertices: pipe(
      order,
      Array.map((at) => face.vertices[at] ?? NONE),
    ),
    uvs: pipe(order, Array.flatMap(pairIn(face.uvs))),
    material: face.material,
  };
};

const shiftedBy =
  (by: number) =>
  (face: Face): Face => ({
    vertices: pipe(
      face.vertices,
      Array.map((vertex) => vertex + by),
    ),
    uvs: face.uvs,
    material: face.material,
  });

const normalIn =
  (points: readonly Point[]) =>
  (face: Face): Point => {
    const corners = pipe(face.vertices, Array.map(pointIn(points)));
    const rotated = [...corners.slice(NEXT), ...corners.slice(NONE, NEXT)];
    const crossed = pipe(
      corners,
      Array.zip(rotated),
      Array.map((pair): Term => [cross(pair), NEXT]),
    );
    return normalized(weighted(crossed));
  };

const pointsOf = (mesh: MeshData): readonly Point[] =>
  pipe(
    Array.makeBy(mesh.positions.length / XYZ, (vertex) => vertex * XYZ),
    Array.map((start): Point => [
      mesh.positions[start] ?? NONE,
      mesh.positions[start + NEXT] ?? NONE,
      mesh.positions[start + UV] ?? NONE,
    ]),
  );

const faceOf = (mesh: MeshData, face: number): Face => {
  const start = mesh.offsets[face] ?? NONE;
  const total = Math.max((mesh.offsets[face + NEXT] ?? NONE) - start, NONE);
  const uvs = Option.match(mesh.uvs, {
    onNone: (): readonly number[] => [],
    onSome: (values) => Array.fromIterable(values.subarray(start * UV, (start + total) * UV)),
  });
  return {
    vertices: Array.fromIterable(mesh.corners.subarray(start, start + total)),
    uvs,
    material: mesh.materials[face] ?? NONE,
  };
};

const shapeOf = (mesh: MeshData): Shape => ({
  points: pointsOf(mesh),
  faces: Array.makeBy(mesh.materials.length, (face) => faceOf(mesh, face)),
  edges: mesh.edges,
});

const offsetsOf = (faces: readonly Face[]): Int32Array => {
  const [total, starts] = Array.mapAccum(faces, NONE, (start, { vertices }) => [
    start + vertices.length,
    start,
  ]);
  return Int32Array.from([...starts, total]);
};

const meshFrom = ({ shape, base }: Readonly<{ shape: Shape; base: MeshData }>): MeshData => ({
  positions: Float32Array.from(Array.flatten(shape.points)),
  offsets: offsetsOf(shape.faces),
  corners: Int32Array.from(
    pipe(
      shape.faces,
      Array.flatMap(({ vertices }) => vertices),
    ),
  ),
  materials: Int32Array.from(
    pipe(
      shape.faces,
      Array.map(({ material }) => material),
    ),
  ),
  uvs: pipe(
    base.uvs,
    Option.map(() =>
      Float32Array.from(
        pipe(
          shape.faces,
          Array.flatMap(({ uvs }) => uvs),
        ),
      ),
    ),
  ),
  slots: base.slots,
  edges: shape.edges,
});

export {
  edgeShiftedBy,
  dot,
  flipped,
  mean,
  meanUv,
  meshFrom,
  normalIn,
  normalized,
  pairIn,
  pointIn,
  shapeOf,
  shiftedBy,
  weighted,
};
export type { Face, Point, Shape, Term };
