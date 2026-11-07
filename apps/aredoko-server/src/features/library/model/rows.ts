import { Schema } from "effect";

const PackageFileRow = Schema.Struct({
  id: Schema.Int,
  path: Schema.String,
  size: Schema.Int,
  modified_at: Schema.Int,
});

const AssetTextRow = Schema.Struct({ id: Schema.Int, text: Schema.String });

const ImageRow = Schema.Struct({
  id: Schema.Int,
  png: Schema.Uint8Array,
  asset_id: Schema.Int,
  pathname: Schema.String,
});

const SourcePathRow = Schema.Struct({ id: Schema.Int, path: Schema.String });

const AssetGuidRow = Schema.Struct({
  id: Schema.Int,
  guid: Schema.String,
  pathname: Schema.String,
});

export { AssetGuidRow, AssetTextRow, ImageRow, PackageFileRow, SourcePathRow };
