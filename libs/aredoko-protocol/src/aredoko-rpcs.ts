import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import {
  AssetKind,
  Id,
  Package,
  ProjectAsset,
  SearchResult,
  Source,
  SourceKind,
  Status,
} from "./models.ts";
import { RequestFailed } from "./request-failed.ts";

const MAX_RESULTS = 200;
const FIRST_OFFSET = 0;

const Sources = Schema.Struct({ sources: Schema.Array(Source) });

const Packages = Schema.Struct({ packages: Schema.Array(Package) });

const Limit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_RESULTS }));

const SearchQuery = {
  query: Schema.String,
  limit: Limit,
  kinds: Schema.Array(AssetKind),
  packageId: Schema.NullOr(Id),
};

const BrowseQuery = {
  packageId: Schema.NullOr(Id),
  kinds: Schema.Array(AssetKind),
  offset: Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)),
  limit: Limit,
};

const Browsed = Schema.Struct({ assets: Schema.Array(SearchResult), total: Schema.Int });

const SearchResults = Schema.Struct({ results: Schema.Array(SearchResult) });

const Preview = Schema.Struct({ png: Schema.Uint8ArrayFromBase64 });

const Extracted = Schema.Struct({
  path: Schema.String,
  assets: Schema.Int,
  missing: Schema.Array(Schema.String),
});

const Library = Schema.Struct({
  path: Schema.String,
  assetStore: Schema.NullOr(Schema.String),
  blm: Schema.NullOr(Schema.String),
});

const RenderJob = Schema.Struct({ assetId: Id, pathname: Schema.String }).annotate({
  identifier: "RenderJob",
});

const RenderJobs = Schema.Struct({ jobs: Schema.Array(RenderJob) });

const ModelFile = Schema.Struct({
  name: Schema.String,
  data: Schema.Uint8ArrayFromBase64,
}).annotate({
  identifier: "ModelFile",
});

const ModelFiles = Schema.Struct({
  model: Schema.Uint8ArrayFromBase64,
  files: Schema.Array(ModelFile),
});

const Rendered = {
  assetId: Id,
  pngs: Schema.Array(Schema.Uint8ArrayFromBase64),
};

const Imported = Schema.Struct({ packages: Schema.Int });

const ProjectAssets = {
  projectPath: Schema.String,
  assets: Schema.Array(ProjectAsset),
  complete: Schema.Boolean,
};

/** @internal */
export class AredokoRpcs extends RpcGroup.make(
  Rpc.make("GetStatus", { success: Status, error: RequestFailed }),
  Rpc.make("ListSources", { success: Sources, error: RequestFailed }),
  Rpc.make("AddSource", {
    payload: { path: Schema.String, kind: SourceKind },
    success: Source,
    error: RequestFailed,
  }),
  Rpc.make("RemoveSource", { payload: { id: Id }, error: RequestFailed }),
  Rpc.make("GetLibrary", { success: Library, error: RequestFailed }),
  Rpc.make("ImportFiles", {
    payload: { paths: Schema.Array(Schema.String) },
    success: Imported,
    error: RequestFailed,
  }),
  Rpc.make("Reindex", { error: RequestFailed }),
  Rpc.make("ListPackages", { success: Packages, error: RequestFailed }),
  Rpc.make("GetPackage", { payload: { id: Id }, success: Package, error: RequestFailed }),
  Rpc.make("ListAssets", { payload: BrowseQuery, success: Browsed, error: RequestFailed }),
  Rpc.make("Search", { payload: SearchQuery, success: SearchResults, error: RequestFailed }),
  Rpc.make("GetPreview", { payload: { assetId: Id }, success: Preview, error: RequestFailed }),
  Rpc.make("Extract", {
    payload: { assetIds: Schema.Array(Id) },
    success: Extracted,
    error: RequestFailed,
  }),
  Rpc.make("LinkBooth", {
    payload: { packageId: Id, url: Schema.String },
    success: Package,
    error: RequestFailed,
  }),
  Rpc.make("PutProjectAssets", { payload: ProjectAssets, error: RequestFailed }),
  Rpc.make("ListRenderJobs", { success: RenderJobs, error: RequestFailed }),
  Rpc.make("ReadModel", { payload: { assetId: Id }, success: ModelFiles, error: RequestFailed }),
  Rpc.make("PutRender", { payload: Rendered, error: RequestFailed }),
  Rpc.make("PutAssetStore", { payload: { path: Schema.String }, error: RequestFailed }),
) {}
