import { Array, Option, pipe } from "effect";

import type { Edge } from "./blend-edges.ts";
import { mean, meanUv, pairIn, pointIn, weighted } from "./blend-geometry.ts";
import type { Face, Point, Shape } from "./blend-geometry.ts";

interface Link {
  readonly from: number;
  readonly to: number;
  readonly faces: readonly number[];
}

interface Edges {
  readonly list: readonly Link[];
  readonly indexOf: (from: number, to: number) => number;
  readonly keyOf: (from: number, to: number) => number;
}

interface Rules {
  readonly smooth: boolean;
  readonly corners: boolean;
  readonly creases: boolean;
}

interface Neighbors {
  readonly faces: readonly Point[];
  readonly middles: readonly Point[];
  readonly rims: readonly Point[];
}

interface Layout {
  readonly edges: Edges;
  readonly total: number;
  readonly centers: number;
}

const NONE = 0;
const NEXT = 1;
const PAIR = 2;
const THREE = 3;
const BOUNDARY_SELF = 0.75;
const BOUNDARY_SIDE = 0.125;
const HALF = 0.5;

const sidesOf = (face: Face): readonly (readonly [number, number])[] =>
  pipe(
    face.vertices,
    Array.map((from, at) => [from, face.vertices[(at + NEXT) % face.vertices.length] ?? from]),
  );

const edgesOf = (faces: readonly Face[], total: number): Edges => {
  const index = new Map<number, number>();
  const list: { from: number; to: number; faces: number[] }[] = [];
  const keyOf = (from: number, to: number): number =>
    Math.min(from, to) * total + Math.max(from, to);
  for (const [face, sides] of pipe(faces, Array.map(sidesOf)).entries()) {
    for (const [from, to] of sides) {
      const found = index.get(keyOf(from, to)) ?? list.push({ from, to, faces: [] }) - NEXT;
      index.set(keyOf(from, to), found);
      Option.map(Array.get(list, found), (edge) => edge.faces.push(face));
    }
  }
  return { list, indexOf: (from, to) => index.get(keyOf(from, to)) ?? NONE, keyOf };
};

const edgePointOf =
  (points: readonly Point[], centers: readonly Point[], hard: (link: Link) => boolean) =>
  (edge: Link): Point => {
    const ends = [pointIn(points)(edge.from), pointIn(points)(edge.to)];
    if (hard(edge)) {
      return mean(ends);
    }
    const sides = pipe(edge.faces, Array.map(pointIn(centers)));
    return mean([...ends, ...sides]);
  };

const emptyPoints = (): Point[] => [];

type Entry = readonly [vertex: number, point: Point];

const bucketsOf = (count: number, entries: readonly Entry[]): readonly (readonly Point[])[] => {
  const table = Array.makeBy(count, emptyPoints).slice(NONE, count);
  for (const [vertex, point] of entries) {
    Option.map(Array.get(table, vertex), (bucket) => bucket.push(point));
  }
  return table;
};

const neighborsOf = (
  shape: Shape,
  { edges, hard }: Readonly<{ edges: Edges; hard: (link: Link) => boolean }>,
  centers: readonly Point[],
): readonly Neighbors[] => {
  const count = shape.points.length;
  const point = pointIn(shape.points);
  const faceEntries = pipe(
    shape.faces,
    Array.flatMap(({ vertices }, face) => {
      const center = pointIn(centers)(face);
      return pipe(
        vertices,
        Array.map((vertex): Entry => [vertex, center]),
      );
    }),
  );
  const middleEntries = pipe(
    edges.list,
    Array.flatMap(({ from, to }): readonly Entry[] => {
      const middle = mean([point(from), point(to)]);
      return [
        [from, middle],
        [to, middle],
      ];
    }),
  );
  const rimEntries = pipe(
    edges.list,
    Array.filter(hard),
    Array.flatMap(({ from, to }): readonly Entry[] => [
      [from, point(to)],
      [to, point(from)],
    ]),
  );
  const faces = bucketsOf(count, faceEntries);
  const middles = bucketsOf(count, middleEntries);
  const rims = bucketsOf(count, rimEntries);
  return Array.makeBy(count, (vertex) => ({
    faces: faces[vertex] ?? [],
    middles: middles[vertex] ?? [],
    rims: rims[vertex] ?? [],
  })).slice(NONE, count);
};

const interiorPoint = (point: Point, around: Neighbors): Point => {
  const valence = around.middles.length;
  return weighted([
    [mean(around.faces), NEXT / valence],
    [mean(around.middles), PAIR / valence],
    [point, (valence - THREE) / valence],
  ]);
};

const vertexPointOf =
  (rules: Rules) =>
  (point: Point, around: Neighbors): Point => {
    const interior = around.rims.length < PAIR && around.faces.length > NONE;
    if (!rules.smooth) {
      return point;
    }
    if (interior && around.middles.length >= THREE) {
      return interiorPoint(point, around);
    }
    const corner = rules.corners && around.faces.length === NEXT;
    if (around.rims.length !== PAIR || corner) {
      return point;
    }
    const [first, second] = [pointIn(around.rims)(NONE), pointIn(around.rims)(NEXT)];
    return weighted([
      [point, BOUNDARY_SELF],
      [first, BOUNDARY_SIDE],
      [second, BOUNDARY_SIDE],
    ]);
  };

const quadsOf =
  ({ edges, total, centers }: Layout) =>
  (face: Face, index: number): readonly Face[] => {
    const count = face.vertices.length;
    const uv = pairIn(face.uvs);
    const center = meanUv(Array.makeBy(count, uv));
    const vertex = (corner: number): number => face.vertices[corner % count] ?? NONE;
    const middle = (from: number): number =>
      total + edges.indexOf(vertex(from), vertex(from + NEXT));
    const previousOf = (at: number): number => (at + count - NEXT) % count;
    return Array.makeBy(count, (at) => ({
      vertices: [vertex(at), middle(at), centers + index, middle(previousOf(at))],
      uvs: [
        ...uv(at),
        ...meanUv([uv(at), uv((at + NEXT) % count)]),
        ...center,
        ...meanUv([uv(previousOf(at)), uv(at)]),
      ],
      material: face.material,
    }));
  };

const centerIn =
  (points: readonly Point[]) =>
  ({ vertices }: Face): Point => {
    const corners = pipe(vertices, Array.map(pointIn(points)));
    return mean(corners);
  };

const sharpOf = (shape: Shape, rules: Rules, links: Edges): ReadonlySet<number> =>
  new Set(
    pipe(
      shape.edges,
      Array.filter(({ crease }) => rules.creases && crease >= HALF),
      Array.map(({ from, to }) => links.keyOf(from, to)),
    ),
  );

const childrenOf =
  (edges: Edges, total: number) =>
  (edge: Edge): readonly Edge[] => {
    const middle = total + edges.indexOf(edge.from, edge.to);
    return [
      { from: edge.from, to: middle, crease: edge.crease, weight: edge.weight },
      { from: middle, to: edge.to, crease: edge.crease, weight: edge.weight },
    ];
  };

const subdividedBy =
  (rules: Rules) =>
  (shape: Shape): Shape => {
    const total = shape.points.length;
    const edges = edgesOf(shape.faces, total);
    const sharp = sharpOf(shape, rules, edges);
    const hard = (link: Link): boolean =>
      !rules.smooth || link.faces.length !== PAIR || sharp.has(edges.keyOf(link.from, link.to));
    const centers = pipe(shape.faces, Array.map(centerIn(shape.points)));
    const middles = pipe(edges.list, Array.map(edgePointOf(shape.points, centers, hard)));
    const neighbors = neighborsOf(shape, { edges, hard }, centers);
    const vertices = pipe(shape.points, Array.zipWith(neighbors, vertexPointOf(rules)));
    const layout = { edges, total, centers: total + edges.list.length };
    return {
      points: [...vertices, ...middles, ...centers],
      faces: pipe(shape.faces, Array.flatMap(quadsOf(layout))),
      edges: pipe(shape.edges, Array.flatMap(childrenOf(edges, total))),
    };
  };

const subdivided =
  ({ levels, rules }: Readonly<{ levels: number; rules: Rules }>) =>
  (shape: Shape): Shape => {
    let current = shape;
    for (let level = NONE; level < levels; level += NEXT) {
      current = subdividedBy(rules)(current);
    }
    return current;
  };

export { subdivided };
export type { Rules };
