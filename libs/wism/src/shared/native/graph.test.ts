import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { decodeGraph } from "./graph.ts";

const WORD = 4;
const PADDING = 0;

interface Words {
  readonly from: number;
  readonly kind: number;
  readonly target: number;
  readonly specifier: number;
  readonly line: number;
  readonly column: number;
  readonly wildcard: number;
}

const wordsOf = (edge: Words): readonly number[] => [
  edge.from,
  edge.kind,
  edge.target,
  edge.specifier,
  edge.line,
  edge.column,
  edge.wildcard,
];

const encode = (edges: readonly Words[], strings: readonly string[]): Uint32Array => {
  const encoder = new TextEncoder();
  const bytes = pipe(
    strings,
    Arr.map((text) => encoder.encode(text)),
  );
  const spans = pipe(
    bytes,
    Arr.scan(PADDING, (offset, chunk) => offset + chunk.length),
    Arr.zip(bytes),
    Arr.flatMap(([offset, chunk]) => [offset, chunk.length]),
  );
  const blob = Uint8Array.from(
    pipe(
      bytes,
      Arr.flatMap((chunk) => [...chunk]),
    ),
  );
  const padded = new Uint8Array(Math.ceil(blob.length / WORD) * WORD);
  padded.set(blob);
  return Uint32Array.from([
    edges.length,
    strings.length,
    blob.length,
    ...pipe(edges, Arr.flatMap(wordsOf)),
    ...spans,
    ...new Uint32Array(padded.buffer),
  ]);
};

test("decodes file and module edges with their positions", () => {
  const words = encode(
    [
      { from: 1, kind: 0, target: 0, specifier: 1, line: 3, column: 15, wildcard: 1 },
      { from: 0, kind: 1, target: 2, specifier: 3, line: 1, column: 5, wildcard: 0 },
    ],
    [
      "src/entities/job/index.ts",
      "../entities/job/index.ts",
      "entities::note",
      "crate::entities::note",
    ],
  );
  expect(decodeGraph(["src/lib.rs", "src/app/index.ts"])(words)).toStrictEqual([
    {
      from: "src/app/index.ts",
      specifier: "../entities/job/index.ts",
      target: { type: "file", value: "src/entities/job/index.ts" },
      line: 3,
      column: 15,
      wildcard: true,
    },
    {
      from: "src/lib.rs",
      specifier: "crate::entities::note",
      target: { type: "module", value: ["entities", "note"] },
      line: 1,
      column: 5,
      wildcard: false,
    },
  ]);
});

test("decodes non-ASCII paths", () => {
  const words = encode(
    [{ from: 0, kind: 0, target: 0, specifier: 0, line: 1, column: 1, wildcard: 0 }],
    ["docs/読み.md"],
  );
  expect(
    pipe(
      decodeGraph(["README.md"])(words),
      Arr.map(({ target }) => target),
    ),
  ).toStrictEqual([{ type: "file", value: "docs/読み.md" }]);
});

test("decodes a graph without edges", () => {
  expect(decodeGraph(["a.ts"])(encode([], []))).toStrictEqual([]);
});
