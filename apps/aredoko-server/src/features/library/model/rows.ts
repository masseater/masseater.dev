import { Schema } from "effect";

export const PackageFileRow = Schema.Struct({
  id: Schema.Int,
  source_id: Schema.Int,
  path: Schema.String,
  size: Schema.Int,
  modified_at: Schema.Int,
});

export const AssetTextRow = Schema.Struct({ id: Schema.Int, text: Schema.String });

export const ImageRow = Schema.Struct({ id: Schema.Int, png: Schema.Uint8Array });

export const PendingImageRow = Schema.Struct({
  id: Schema.Int,
  asset_id: Schema.Int,
  pathname: Schema.String,
});

export const SourcePathRow = Schema.Struct({ id: Schema.Int, path: Schema.String });

export const AssetGuidRow = Schema.Struct({
  id: Schema.Int,
  guid: Schema.String,
  pathname: Schema.String,
});
