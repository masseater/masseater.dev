import { Array, pipe } from "effect";
import { Matrix4, Vector3 } from "three";

import { edgeShiftedBy, flipped, pairIn, shiftedBy } from "./blend-geometry.ts";
import type { Face, Point, Shape } from "./blend-geometry.ts";

interface Copy {
  readonly matrix: readonly number[];
  readonly flip: boolean;
  readonly uv: (pair: readonly number[]) => readonly number[];
}

interface Mirror {
  readonly axes: readonly number[];
  readonly frame: readonly number[];
  readonly flipU: boolean;
  readonly flipV: boolean;
  readonly uvOffset: readonly number[];
  readonly uvShift: readonly number[];
}

interface Repeat {
  readonly count: number;
  readonly offset: readonly number[];
  readonly uvOffset: readonly number[];
}

const NONE = 0;
const NEXT = 1;
const UNIT = 1;
const REFLECT = -1;
const AXES: readonly number[] = [NONE, NEXT, NEXT + NEXT];

const movedBy = (elements: readonly number[]) => {
  const matrix = new Matrix4().fromArray(elements);
  return (point: Point): Point => {
    const [first, second, third] = new Vector3(...point).applyMatrix4(matrix).toArray();
    return [first, second, third];
  };
};

const copiedFace =
  (copy: Copy, by: number) =>
  (face: Face): Face => {
    const uvs = pipe(
      Array.makeBy(face.vertices.length, pairIn(face.uvs)),
      Array.flatMap((pair) => Array.match(pair, { onEmpty: () => [], onNonEmpty: copy.uv })),
    );
    const result = { vertices: shiftedBy(by)(face).vertices, uvs, material: face.material };
    if (copy.flip) {
      return flipped(result);
    }
    return result;
  };

const withCopies = (shape: Shape, copies: readonly Copy[]): Shape => {
  const total = shape.points.length;
  const extra = pipe(
    copies,
    Array.map((copy, index) => ({
      points: pipe(shape.points, Array.map(movedBy(copy.matrix))),
      faces: pipe(shape.faces, Array.map(copiedFace(copy, total * (index + NEXT)))),
      edges: pipe(shape.edges, Array.map(edgeShiftedBy(total * (index + NEXT)))),
    })),
  );
  return {
    points: [
      ...shape.points,
      ...pipe(
        extra,
        Array.flatMap(({ points }) => points),
      ),
    ],
    faces: [
      ...shape.faces,
      ...pipe(
        extra,
        Array.flatMap(({ faces }) => faces),
      ),
    ],
    edges: [
      ...shape.edges,
      ...pipe(
        extra,
        Array.flatMap(({ edges }) => edges),
      ),
    ],
  };
};

const reflection = (elements: readonly number[], axis: number): readonly number[] => {
  const [first = UNIT, second = UNIT, third = UNIT] = pipe(
    AXES,
    Array.map((candidate) =>
      Array.match(
        Array.filter([candidate], (at) => at === axis),
        {
          onEmpty: () => UNIT,
          onNonEmpty: () => REFLECT,
        },
      ),
    ),
  );
  const frame = new Matrix4().fromArray(elements);
  const inverse = frame.clone().invert();
  return frame
    .multiply(new Matrix4().makeScale(first, second, third))
    .multiply(inverse)
    .toArray();
};

const flippedIf = (flip: boolean, value: number, offset: number): number =>
  Array.match(Array.filter([flip], Boolean), {
    onEmpty: () => value,
    onNonEmpty: () => UNIT - value + offset,
  });

const mirroredUv =
  (mirror: Mirror) =>
  ([across = NONE, down = NONE]: readonly number[]): readonly number[] => {
    const [offsetU = NONE, offsetV = NONE] = mirror.uvOffset;
    const [shiftU = NONE, shiftV = NONE] = mirror.uvShift;
    const nextU = flippedIf(mirror.flipU, across, offsetU);
    const nextV = flippedIf(mirror.flipV, UNIT - down, offsetV);
    return [nextU + shiftU, UNIT - (nextV + shiftV)];
  };

const mirrored =
  (mirror: Mirror) =>
  (shape: Shape): Shape => {
    let current = shape;
    for (const axis of mirror.axes) {
      const copy = { matrix: reflection(mirror.frame, axis), flip: true, uv: mirroredUv(mirror) };
      current = withCopies(current, [copy]);
    }
    return current;
  };

const repeatedUv =
  ([offsetU = NONE, offsetV = NONE]: readonly number[], times: number) =>
  ([across = NONE, down = NONE]: readonly number[]): readonly number[] => [
    across + offsetU * times,
    down - offsetV * times,
  ];

const repeated =
  (repeat: Repeat) =>
  (shape: Shape): Shape => {
    const offset = new Matrix4().fromArray(repeat.offset);
    const matrix = new Matrix4();
    const copies: Copy[] = [];
    for (let times = NEXT; times < repeat.count; times += NEXT) {
      matrix.multiply(offset);
      copies.push({
        matrix: matrix.toArray(),
        flip: false,
        uv: repeatedUv(repeat.uvOffset, times),
      });
    }
    return withCopies(shape, copies);
  };

export { mirrored, repeated };
export type { Mirror, Repeat };
