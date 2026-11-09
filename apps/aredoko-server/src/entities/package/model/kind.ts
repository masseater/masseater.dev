import { LOOSE_EXTENSIONS } from "@masseater.dev/aredoko-protocol";
import type { AssetKind as AssetKindSchema } from "@masseater.dev/aredoko-protocol";
import { Array, Option, Record, String, pipe } from "effect";

import { capture } from "#shared/text";

type AssetKind = typeof AssetKindSchema.Type;

const EXTENSIONS = {
  ...LOOSE_EXTENSIONS,
  material: ["mat"],
  prefab: ["prefab"],
  shader: ["shader", "cginc", "hlsl", "shadergraph", "compute"],
  animation: ["anim", "controller", "overridecontroller", "mask"],
  scene: ["unity"],
  script: ["cs", "asmdef", "dll"],
} as const satisfies Readonly<Record<Exclude<AssetKind, "other">, readonly string[]>>;

const extensionOf = capture({ pattern: /\.(?<extension>[^./]+)$/u, name: "extension" });

const kindOf = (pathname: string): AssetKind =>
  pipe(
    extensionOf(pathname),
    Option.map(String.toLowerCase),
    Option.flatMap((extension) =>
      pipe(
        Record.toEntries(EXTENSIONS),
        Array.findFirst(([, extensions]) => pipe(extensions, Array.contains(extension))),
      ),
    ),
    Option.match({ onNone: (): AssetKind => "other", onSome: ([kind]) => kind }),
  );

export { kindOf };
export type { AssetKind };
