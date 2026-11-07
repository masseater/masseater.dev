import { Array, String, pipe } from "effect";

import type { AssetType } from "./images.ts";

type Condition = "named" | "anonymous";

const CONDITIONS: readonly Condition[] = ["named", "anonymous"];

const GUID_LENGTH = 32;
const HEX = 16;

interface LibraryAsset {
  readonly id: string;
  readonly type: AssetType;
}

interface Placed {
  readonly asset: LibraryAsset;
  readonly index: number;
}

const EXTENSIONS: Readonly<Record<AssetType, string>> = { model: "fbx", texture: "jpg" };

const FOLDERS: Readonly<Record<AssetType, string>> = { model: "Models", texture: "Textures" };

const PATHNAMES: Readonly<Record<Condition, (placed: Placed) => string>> = {
  named: ({ asset: { id, type } }) => `Assets/PolyHaven/${id}/${id}.${EXTENSIONS[type]}`,
  anonymous: ({ asset: { type }, index }) =>
    `Assets/${FOLDERS[type]}/asset_${index.toString()}.${EXTENSIONS[type]}`,
};

const guidOf = (index: number): string =>
  pipe(index.toString(HEX), String.padStart(GUID_LENGTH, "0"));

const pathnameOf =
  (condition: Condition) =>
  (placed: Placed): string =>
    PATHNAMES[condition](placed);

const libraryAssets = (library: {
  readonly models: readonly string[];
  readonly textures: readonly string[];
}): readonly LibraryAsset[] => [
  ...pipe(
    library.models,
    Array.map((id): LibraryAsset => ({ id, type: "model" })),
  ),
  ...pipe(
    library.textures,
    Array.map((id): LibraryAsset => ({ id, type: "texture" })),
  ),
];

export { CONDITIONS, guidOf, libraryAssets, pathnameOf };
export type { Condition, LibraryAsset, Placed };
