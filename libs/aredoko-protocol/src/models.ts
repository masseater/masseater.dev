import { Schema } from "effect";

const NO_ID = 0;

const Id = Schema.Int.check(Schema.isGreaterThan(NO_ID));

const SourceKind = Schema.Literals(["folder", "project"]).annotate({ identifier: "SourceKind" });

const PackageKind = Schema.Literals(["unitypackage", "project", "files"]).annotate({
  identifier: "PackageKind",
});

const AssetKind = Schema.Literals([
  "texture",
  "model",
  "material",
  "prefab",
  "shader",
  "animation",
  "audio",
  "scene",
  "script",
  "other",
]).annotate({ identifier: "AssetKind" });

const Source = Schema.Struct({
  id: Id,
  path: Schema.String,
  kind: SourceKind,
  packages: Schema.Int,
}).annotate({ identifier: "Source" });

const KindCount = Schema.Struct({ kind: AssetKind, count: Schema.Int }).annotate({
  identifier: "KindCount",
});

const Summary = Schema.Struct({
  counts: Schema.Array(KindCount),
  shaders: Schema.Array(Schema.String),
  avatars: Schema.Array(Schema.String),
  colors: Schema.Array(Schema.String),
}).annotate({ identifier: "Summary" });

const BoothItem = Schema.Struct({
  id: Id,
  url: Schema.String,
  name: Schema.String,
  shop: Schema.String,
  price: Schema.String,
  tags: Schema.Array(Schema.String),
}).annotate({ identifier: "BoothItem" });

const Package = Schema.Struct({
  id: Id,
  kind: PackageKind,
  path: Schema.String,
  name: Schema.String,
  assets: Schema.Int,
  summary: Summary,
  booth: Schema.NullOr(BoothItem),
}).annotate({ identifier: "Package" });

const SearchResult = Schema.Struct({
  assetId: Id,
  guid: Schema.String,
  pathname: Schema.String,
  kind: AssetKind,
  packageId: Id,
  packageName: Schema.String,
  packageKind: PackageKind,
  score: Schema.Finite,
  hasPreview: Schema.Boolean,
  analyzing: Schema.Boolean,
  file: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SearchResult" });

const Progress = Schema.Struct({ done: Schema.Int, total: Schema.Int }).annotate({
  identifier: "Progress",
});

const Status = Schema.Struct({
  version: Schema.String,
  device: Schema.String,
  indexing: Schema.Boolean,
  current: Schema.NullOr(Schema.String),
  analyzingAssetIds: Schema.Array(Id),
  packages: Schema.Int,
  step: Progress,
  images: Progress,
}).annotate({ identifier: "Status" });

const ProjectAsset = Schema.Struct({
  guid: Schema.String,
  pathname: Schema.String,
  previews: Schema.Array(Schema.Uint8ArrayFromBase64),
}).annotate({ identifier: "ProjectAsset" });

export {
  AssetKind,
  BoothItem,
  Id,
  Package,
  PackageKind,
  ProjectAsset,
  SearchResult,
  Source,
  SourceKind,
  Status,
  Summary,
};
