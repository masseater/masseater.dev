import { Array, Option, pipe } from "effect";

import type { Edge } from "./blend-edges.ts";
import { dot, normalIn } from "./blend-geometry.ts";
import type { Face, Point, Shape } from "./blend-geometry.ts";

export interface Bevel {
  readonly limit: "all" | "angle" | "weight" | "none";
  readonly angle: number;
}

interface Side {
  readonly from: number;
  readonly to: number;
  readonly normal: Point;
}

const NONE = 0;
const NEXT = 1;
const PAIR = 2;
const UNIT = 1;
const AWAY = -1;

const sidesOf =
  (points: readonly Point[]) =>
  (face: Face): readonly Side[] => {
    const normal = normalIn(points)(face);
    return pipe(
      face.vertices,
      Array.map((from, at) => ({
        from,
        to: face.vertices[(at + NEXT) % face.vertices.length] ?? from,
        normal,
      })),
    );
  };

const groupsOf = (shape: Shape): readonly (readonly Side[])[] => {
  const total = shape.points.length;
  const groups = new Map<number, Side[]>();
  const sides = pipe(shape.faces, Array.flatMap(sidesOf(shape.points)));
  for (const side of sides) {
    const key = Math.min(side.from, side.to) * total + Math.max(side.from, side.to);
    const group = groups.get(key) ?? [];
    group.push(side);
    groups.set(key, group);
  }
  return Array.fromIterable(groups.values());
};

const bent =
  (angle: number) =>
  (group: readonly Side[]): boolean =>
    group.length === PAIR &&
    pipe(
      Option.all([Array.get(group, NONE), Array.get(group, NEXT)]),
      Option.map(([first, second]) => {
        const cosine = Math.min(Math.max(dot([first.normal, second.normal]), AWAY), UNIT);
        return Math.acos(cosine) > angle;
      }),
      Option.getOrElse(() => false),
    );

const sharpOf = (bevel: Bevel, shape: Shape): readonly (readonly Side[])[] => {
  const groups = groupsOf(shape);
  if (bevel.limit === "all") {
    return groups;
  }
  if (bevel.limit === "angle") {
    return pipe(groups, Array.filter(bent(bevel.angle)));
  }
  return [];
};

const creased = ({ from, to }: Readonly<{ from: number; to: number }>): Edge => ({
  from,
  to,
  crease: UNIT,
  weight: NONE,
});

export const beveled =
  (bevel: Bevel) =>
  (shape: Shape): Shape => {
    const weighted = pipe(
      shape.edges,
      Array.filter(({ weight }) => bevel.limit === "weight" && weight > NONE),
    );
    const sharp = pipe(sharpOf(bevel, shape), Array.flatMap(Array.take(NEXT)));
    return {
      points: shape.points,
      faces: shape.faces,
      edges: [...shape.edges, ...pipe([...weighted, ...sharp], Array.map(creased))],
    };
  };
