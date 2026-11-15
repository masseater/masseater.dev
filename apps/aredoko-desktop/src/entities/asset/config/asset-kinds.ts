import type { AssetKind } from "@masseater.dev/aredoko-protocol";

const KIND_LABELS: Readonly<Record<typeof AssetKind.Type, string>> = {
  texture: "テクスチャ",
  model: "3D モデル",
  material: "マテリアル",
  prefab: "プレハブ",
  shader: "シェーダー",
  animation: "アニメーション",
  audio: "オーディオ",
  scene: "シーン",
  script: "スクリプト",
  other: "その他",
};

const SEARCHABLE_KINDS: readonly (typeof AssetKind.Type)[] = [
  "texture",
  "model",
  "material",
  "prefab",
  "shader",
  "animation",
  "audio",
  "scene",
  "script",
];

export { KIND_LABELS, SEARCHABLE_KINDS };
