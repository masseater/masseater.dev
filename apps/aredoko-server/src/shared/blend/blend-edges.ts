import { Array, Option, pipe } from "effect";

import { attribute, floatArray, intArray, named } from "./blend-attributes.ts";
import { elementsOf, follow, intOf } from "./blend-structs.ts";
import type { Instance } from "./blend-structs.ts";

export interface Edge {
  readonly from: number;
  readonly to: number;
  readonly crease: number;
  readonly weight: number;
}

const EDGE_DOMAIN = ["edata", "edge_data"];
const NONE = 0;
const NEXT = 1;
const PAIR = 2;
const BYTE = 256;
const BYTE_MAX = 255;

const unsigned = (value: number): number => ((value % BYTE) + BYTE) % BYTE;

const byteOf = (edge: Instance, name: string): number =>
  unsigned(Option.getOrElse(intOf({ instance: edge, names: [name] }), () => NONE)) / BYTE_MAX;

const legacyEdges = (mesh: Instance): Option.Option<readonly Edge[]> =>
  pipe(
    follow({ instance: mesh, names: ["medge"] }),
    Option.map((block) =>
      pipe(
        elementsOf({ file: mesh.file, block, structName: "MEdge" }),
        Array.map((edge): Edge => ({
          from: Option.getOrElse(intOf({ instance: edge, names: ["v1"] }), () => NONE),
          to: Option.getOrElse(intOf({ instance: edge, names: ["v2"] }), () => NONE),
          crease: byteOf(edge, "crease"),
          weight: byteOf(edge, "bweight"),
        })),
      ),
    ),
  );

const edgeFloats = (mesh: Instance, name: string, count: number): Float32Array =>
  pipe(
    attribute({ mesh, domain: EDGE_DOMAIN, matches: named(name) }),
    Option.flatMap((block) => floatArray({ file: mesh.file, block, length: count })),
    Option.getOrElse(() => new Float32Array(count)),
  );

const modernEdges = (mesh: Instance, count: number): Option.Option<readonly Edge[]> =>
  Option.gen(function* attributeEdges() {
    const block = yield* attribute({ mesh, domain: EDGE_DOMAIN, matches: named(".edge_verts") });
    const ends = yield* intArray({ file: mesh.file, block, length: count * PAIR });
    const creases = edgeFloats(mesh, "crease_edge", count);
    const weights = edgeFloats(mesh, "bevel_weight_edge", count);
    return Array.makeBy(count, (edge) => ({
      from: ends[edge * PAIR] ?? NONE,
      to: ends[edge * PAIR + NEXT] ?? NONE,
      crease: creases[edge] ?? NONE,
      weight: weights[edge] ?? NONE,
    })).slice(NONE, count);
  });

export const markedEdges = (mesh: Instance): readonly Edge[] => {
  const names = ["totedge", "edges_num"];
  const count = Option.getOrElse(intOf({ instance: mesh, names }), () => NONE);
  return pipe(
    modernEdges(mesh, count),
    Option.orElse(() => legacyEdges(mesh)),
    Option.getOrElse((): readonly Edge[] => []),
    Array.filter(({ crease, weight }) => crease > NONE || weight > NONE),
  );
};
