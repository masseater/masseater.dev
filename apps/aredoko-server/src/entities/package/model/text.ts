import { Array, String, pipe } from "effect";

import { avatarsIn, colorsIn, wordsOf } from "./aliases.ts";
import type { AssetKind } from "./kind.ts";

const KIND_LABELS: Readonly<Record<AssetKind, string>> = {
  texture: "テクスチャ 画像",
  model: "3Dモデル メッシュ",
  material: "マテリアル",
  prefab: "プレハブ",
  shader: "シェーダー",
  animation: "アニメーション",
  audio: "音声 サウンド",
  scene: "シーン",
  script: "スクリプト",
  other: "",
};

const searchableText = ({
  pathname,
  kind,
  packageName,
}: {
  readonly pathname: string;
  readonly kind: AssetKind;
  readonly packageName: string;
}): string =>
  pipe(
    [
      pathname,
      packageName,
      Array.join(wordsOf(pathname), " "),
      Array.join(avatarsIn(`${packageName} ${pathname}`), " "),
      Array.join(colorsIn(pathname), " "),
      KIND_LABELS[kind],
    ],
    Array.filter(String.isNonEmpty),
    Array.join(" "),
  );

export { searchableText };
