import { Array, Option, String, pipe } from "effect";

import { floatsOf, follow, instanceOf, intOf, listOf, textOf } from "./blend-structs.ts";
import type { BlendFile, Instance } from "./blend-structs.ts";

export type Color = readonly [red: number, green: number, blue: number];

export interface ImageSource {
  readonly key: number;
  readonly packed: Option.Option<Uint8Array>;
  readonly filepath: string;
}

export interface Surface {
  readonly color: Color;
  readonly image: Option.Option<ImageSource>;
}

const DEFAULT_SHADE = 0.8;
const GRAY: Color = [DEFAULT_SHADE, DEFAULT_SHADE, DEFAULT_SHADE];
const PLAIN: Surface = { color: GRAY, image: Option.none() };
const NONE = 0;
const USED = 1;
const MAX_NODES = 256;
const OUTPUT = "ShaderNodeOutputMaterial";
const GROUP = "ShaderNodeGroup";
const GROUP_OUTPUT = "NodeGroupOutput";
const IMAGE = "ShaderNodeTexImage";
const IMAGE_CODE = "IM";
const COLOR_INPUTS: readonly string[] = ["Base Color", "Color"];
const SHADERS: readonly string[] = [
  "ShaderNodeBsdf",
  "ShaderNodeEmission",
  "ShaderNodeEeveeSpecular",
];

const pointee = (instance: Instance, names: readonly string[]): Option.Option<Instance> =>
  Option.flatMap(follow({ instance, names }), (block) =>
    instanceOf({ file: instance.file, block }),
  );

const idnameOf = (node: Instance): string =>
  Option.getOrElse(textOf({ instance: node, names: ["idname"] }), () => "");

const inputsOf = (node: Instance): readonly Instance[] =>
  listOf({ instance: node, names: ["inputs"] });

const groupOutputOf = (node: Instance): Option.Option<Instance> =>
  pipe(
    Option.liftPredicate(node, (candidate) => idnameOf(candidate) === GROUP),
    Option.flatMap((group) => pointee(group, ["id"])),
    Option.map((tree) => listOf({ instance: tree, names: ["nodes"] })),
    Option.flatMap(Array.findFirst((inner) => idnameOf(inner) === GROUP_OUTPUT)),
  );

const sourcesOf = (node: Instance): readonly Instance[] => {
  const inner = Option.toArray(groupOutputOf(node));
  return pipe(
    inputsOf(node),
    Array.map((socket) =>
      pipe(
        pointee(socket, ["link"]),
        Option.flatMap((link) => pointee(link, ["fromnode"])),
      ),
    ),
    Array.getSomes,
    Array.appendAll(inner),
  );
};

const upstreamOf = (output: Instance): readonly Instance[] => {
  const seen = new Set<number>();
  const order: Instance[] = [];
  const queue: Instance[] = [output];
  for (const node of queue) {
    if (!seen.has(node.offset) && order.length < MAX_NODES) {
      seen.add(node.offset);
      order.push(node);
      queue.push(...sourcesOf(node));
    }
  }
  return order;
};

const socketName = (socket: Instance): string =>
  Option.getOrElse(textOf({ instance: socket, names: ["name", "identifier"] }), () => "");

const rgbOf = (values: readonly number[]): Color => {
  const [red = DEFAULT_SHADE, green = DEFAULT_SHADE, blue = DEFAULT_SHADE] = values;
  return [red, green, blue];
};

const inputColor = (node: Instance): Option.Option<Color> =>
  pipe(
    inputsOf(node),
    Array.findFirst((socket) => Array.contains(COLOR_INPUTS, socketName(socket))),
    Option.flatMap((socket) => pointee(socket, ["default_value"])),
    Option.flatMap((value) => floatsOf({ instance: value, names: ["value"] })),
    Option.map(rgbOf),
  );

const isShader = (node: Instance): boolean =>
  pipe(
    SHADERS,
    Array.some((prefix) => pipe(idnameOf(node), String.startsWith(prefix))),
  );

const packedOf = (image: Instance): Option.Option<Uint8Array> =>
  Option.gen(function* packedBytes() {
    const listed = pipe(
      listOf({ instance: image, names: ["packedfiles"] }),
      Array.head,
      Option.flatMap((entry) => pointee(entry, ["packedfile"])),
    );
    const packed = yield* Option.orElse(pointee(image, ["packedfile"]), () => listed);
    const size = yield* intOf({ instance: packed, names: ["size"] });
    const block = yield* follow({ instance: packed, names: ["data"] });
    const { bytes } = image.file;
    return bytes.subarray(block.data, block.data + Math.min(size, block.length));
  });

const imageOf = (image: Instance): ImageSource => ({
  key: image.offset,
  packed: packedOf(image),
  filepath: Option.getOrElse(textOf({ instance: image, names: ["filepath", "name"] }), () => ""),
});

const nodeSurface = (material: Instance, fallback: Color): Option.Option<Surface> =>
  Option.gen(function* fromNodes() {
    const tree = yield* pointee(material, ["nodetree"]);
    const nodes = listOf({ instance: tree, names: ["nodes"] });
    const output = yield* Array.findFirst(nodes, (node) => idnameOf(node) === OUTPUT);
    const upstream = upstreamOf(output);
    const image = pipe(
      upstream,
      Array.findFirst((node) => idnameOf(node) === IMAGE),
      Option.flatMap((node) => pointee(node, ["id"])),
      Option.map(imageOf),
    );
    const color = pipe(
      upstream,
      Array.filter(isShader),
      Array.findFirst(inputColor),
      Option.getOrElse(() => fallback),
    );
    return { color, image };
  });

const viewportColor = (material: Instance): Color =>
  rgbOf(
    pipe(
      ["r", "g", "b"],
      Array.map((channel) =>
        pipe(
          floatsOf({ instance: material, names: [channel] }),
          Option.flatMap(Array.head),
          Option.getOrElse(() => DEFAULT_SHADE),
        ),
      ),
    ),
  );

export const surfaceOf = (material: Option.Option<Instance>): Surface =>
  Option.match(material, {
    onNone: () => PLAIN,
    onSome: (found) => {
      const color = viewportColor(found);
      const nodes = Option.getOrElse(intOf({ instance: found, names: ["use_nodes"] }), () => USED);
      return pipe(
        Option.liftPredicate(found, () => nodes !== NONE),
        Option.flatMap((used) => nodeSurface(used, color)),
        Option.getOrElse((): Surface => ({ color, image: Option.none() })),
      );
    },
  });

export const imagesOf = (file: BlendFile): readonly ImageSource[] =>
  pipe(
    file.blocks,
    Array.filter(({ code }) => pipe(code, String.startsWith(IMAGE_CODE))),
    Array.map((block) => instanceOf({ file, block })),
    Array.getSomes,
    Array.map(imageOf),
  );
