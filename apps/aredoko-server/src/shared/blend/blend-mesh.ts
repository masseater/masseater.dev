import { Array, Option, pipe } from "effect";

import {
  CORNER_DOMAIN,
  FACE_DOMAIN,
  VERTEX_DOMAIN,
  attribute,
  floatArray,
  intArray,
  named,
} from "./blend-attributes.ts";
import { pointerAt, pointerBytes } from "./blend-blocks.ts";
import { markedEdges } from "./blend-edges.ts";
import type { Edge } from "./blend-edges.ts";
import { elementsOf, floatsOf, follow, instanceOf, intOf, resolve } from "./blend-structs.ts";
import type { Instance } from "./blend-structs.ts";
import { uvsOf } from "./blend-uv.ts";

interface MeshData {
  readonly positions: Float32Array;
  readonly offsets: Int32Array;
  readonly corners: Int32Array;
  readonly materials: Int32Array;
  readonly uvs: Option.Option<Float32Array>;
  readonly slots: readonly Option.Option<Instance>[];
  readonly edges: readonly Edge[];
}

interface Counts {
  readonly vertices: number;
  readonly faces: number;
  readonly corners: number;
}

interface Faces {
  readonly offsets: Int32Array;
  readonly corners: Int32Array;
  readonly materials: Option.Option<Int32Array>;
}

interface Span {
  readonly start: number;
  readonly total: number;
  readonly material: number;
}

const XYZ = 3;
const NONE = 0;
const NEXT = 1;

const countOf = (mesh: Instance, names: readonly string[]): number =>
  Option.getOrElse(intOf({ instance: mesh, names }), () => NONE);

const countsOf = (mesh: Instance): Counts => ({
  vertices: countOf(mesh, ["totvert", "verts_num"]),
  faces: countOf(mesh, ["totpoly", "faces_num"]),
  corners: countOf(mesh, ["totloop", "corners_num"]),
});

const legacyPositions = (mesh: Instance, counts: Counts): Option.Option<Float32Array> =>
  Option.gen(function* oldPositions() {
    const block = yield* follow({ instance: mesh, names: ["mvert"] });
    const vertices = elementsOf({ file: mesh.file, block, structName: "MVert" }).slice(
      NONE,
      counts.vertices,
    );
    if (vertices.length < counts.vertices) {
      return yield* Option.none();
    }
    const coordinates = yield* Option.all(
      pipe(
        vertices,
        Array.map((vertex) => floatsOf({ instance: vertex, names: ["co"] })),
      ),
    );
    return Float32Array.from(Array.flatten(coordinates));
  });

const positionsOf = (mesh: Instance, counts: Counts): Option.Option<Float32Array> =>
  pipe(
    attribute({ mesh, domain: VERTEX_DOMAIN, matches: named("position") }),
    Option.flatMap((block) =>
      floatArray({ file: mesh.file, block, length: counts.vertices * XYZ }),
    ),
    Option.orElse(() => legacyPositions(mesh, counts)),
  );

const modernFaces = (mesh: Instance, counts: Counts): Option.Option<Faces> =>
  Option.gen(function* offsetFaces() {
    const names = ["poly_offset_indices", "face_offset_indices"];
    const offsetBlock = yield* follow({ instance: mesh, names });
    const offsets = yield* intArray({
      file: mesh.file,
      block: offsetBlock,
      length: counts.faces + NEXT,
    });
    const matches = named(".corner_vert");
    const cornerBlock = yield* attribute({ mesh, domain: CORNER_DOMAIN, matches });
    const corners = yield* intArray({
      file: mesh.file,
      block: cornerBlock,
      length: counts.corners,
    });
    return { offsets, corners, materials: Option.none() };
  });

const spanOf = (polygon: Instance): Option.Option<Span> =>
  Option.gen(function* polygonSpan() {
    const start = yield* intOf({ instance: polygon, names: ["loopstart"] });
    const total = yield* intOf({ instance: polygon, names: ["totloop"] });
    const material = countOf(polygon, ["mat_nr"]);
    return { start, total, material };
  });

const legacyCorners = (mesh: Instance): Option.Option<Int32Array> =>
  Option.gen(function* oldCorners() {
    const block = yield* follow({ instance: mesh, names: ["mloop"] });
    const loops = elementsOf({ file: mesh.file, block, structName: "MLoop" });
    const vertices = yield* Option.all(
      pipe(
        loops,
        Array.map((loop) => intOf({ instance: loop, names: ["v"] })),
      ),
    );
    return Int32Array.from(vertices);
  });

const legacyFaces = (mesh: Instance, counts: Counts): Option.Option<Faces> =>
  Option.gen(function* oldFaces() {
    const block = yield* follow({ instance: mesh, names: ["mpoly"] });
    const polygons = elementsOf({ file: mesh.file, block, structName: "MPoly" });
    const spans = yield* Option.all(Array.map(polygons.slice(NONE, counts.faces), spanOf));
    const offsets = new Int32Array(counts.faces + NEXT);
    for (const [index, { start, total }] of spans.entries()) {
      offsets.set([start, start + total], index);
    }
    const materials = Int32Array.from(spans, ({ material }) => material);
    const corners = yield* legacyCorners(mesh);
    return { offsets, corners, materials: Option.some(materials) };
  });

const materialsOf = (mesh: Instance, counts: Counts, faces: Faces): Int32Array =>
  pipe(
    faces.materials,
    Option.orElse(() =>
      pipe(
        attribute({ mesh, domain: FACE_DOMAIN, matches: named("material_index") }),
        Option.flatMap((block) => intArray({ file: mesh.file, block, length: counts.faces })),
      ),
    ),
    Option.getOrElse(() => new Int32Array(counts.faces)),
  );

const slotOf = (mesh: Instance, offset: number): Option.Option<Instance> => {
  const { bytes, layout } = mesh.file;
  const address = pointerAt({ bytes, offset, layout });
  return Option.flatMap(resolve({ file: mesh.file, address, anchor: offset }), (block) =>
    instanceOf({ file: mesh.file, block }),
  );
};

const slotsOf = (mesh: Instance): readonly Option.Option<Instance>[] =>
  pipe(
    follow({ instance: mesh, names: ["mat"] }),
    Option.map((list) => {
      const width = pointerBytes(mesh.file.layout);
      const slots = Math.min(countOf(mesh, ["totcol"]), Math.floor(list.length / width));
      return Array.makeBy(slots, (slot) => slotOf(mesh, list.data + slot * width));
    }),
    Option.getOrElse((): readonly Option.Option<Instance>[] => []),
  );

const readMesh = (mesh: Instance): Option.Option<MeshData> =>
  Option.gen(function* meshData() {
    const counts = countsOf(mesh);
    if (counts.vertices <= NONE || counts.faces <= NONE) {
      return yield* Option.none();
    }
    const positions = yield* positionsOf(mesh, counts);
    const faces = yield* pipe(
      modernFaces(mesh, counts),
      Option.orElse(() => legacyFaces(mesh, counts)),
    );
    const materials = materialsOf(mesh, counts, faces);
    const { offsets, corners } = faces;
    const uvs = uvsOf({ mesh, corners: counts.corners });
    const slots = slotsOf(mesh);
    return { positions, offsets, corners, materials, uvs, slots, edges: markedEdges(mesh) };
  });

export { readMesh };
export type { MeshData };
