import {
  AredokoClient,
  ENDPOINT_FILE,
  ServerUrl,
  aredokoClientLayer,
  awaitEndpoint,
} from "@masseater.dev/aredoko-protocol";
import type {
  AssetKind,
  Package,
  SearchResult,
  Source,
  SourceKind,
  Status,
} from "@masseater.dev/aredoko-protocol";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import {
  ConfigProvider,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
  Option,
  Predicate,
  Record,
  Schema,
  pipe,
} from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import { ServerError } from "./server-error.ts";

const STATUS_TIMEOUT = Duration.fromInputUnsafe("3 seconds");
const REQUEST_TIMEOUT = Duration.fromInputUnsafe("15 seconds");
const LONG_REQUEST_TIMEOUT = Duration.fromInputUnsafe("10 minutes");
const UNREACHABLE = "接続できません";

const unreachable = (): ServerError => ServerError.make({ message: UNREACHABLE });

const serverUrlLayer = Layer.effect(
  ServerUrl,
  Effect.gen(function* serverUrl() {
    const httpClient = yield* HttpClient.HttpClient;
    const client = HttpClient.filterStatusOk(httpClient);
    const endpointFile = Effect.gen(function* endpointFile() {
      const directory = yield* Effect.tryPromise({ try: appLocalDataDir, catch: unreachable });
      const file = yield* Effect.tryPromise({
        try: () => join(directory, ENDPOINT_FILE),
        catch: unreachable,
      });
      const response = yield* client.get(convertFileSrc(file));
      return yield* response.text;
    }).pipe(
      Effect.provideService(FetchHttpClient.RequestInit, { cache: "no-store" }),
      Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    );
    return { url: awaitEndpoint(endpointFile) };
  }),
);

const SERVICE_NAME = "aredoko-desktop";

const viteEnv = pipe(import.meta.env, Record.filter(Predicate.isString));

const configLayer = ConfigProvider.layer(ConfigProvider.fromEnv({ env: viteEnv }));

const tracingLayer = OtlpTracer.layerFromConfig({ resource: { serviceName: SERVICE_NAME } }).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(configLayer),
);

const clientLayer = aredokoClientLayer.pipe(Layer.provide(serverUrlLayer));

const runtime = ManagedRuntime.make(
  Layer.mergeAll(clientLayer, tracingLayer).pipe(Layer.provide(FetchHttpClient.layer)),
);

const run = <Value>(
  duration: Duration.Duration,
  request: Effect.Effect<Value, { readonly message: string }, AredokoClient>,
): Promise<Value> =>
  runtime.runPromise(
    request.pipe(
      Effect.timeoutOrElse({
        duration,
        orElse: () => Effect.fail({ message: UNREACHABLE }),
      }),
      Effect.mapError(({ message }) => ServerError.make({ message })),
    ),
  );

const callWithin =
  (duration: Duration.Duration) =>
  <Value>(
    request: (
      client: typeof AredokoClient.Service,
    ) => Effect.Effect<Value, { readonly message: string }>,
  ): Promise<Value> =>
    run(duration, AredokoClient.pipe(Effect.flatMap(request)));

const call = callWithin(REQUEST_TIMEOUT);
const callLong = callWithin(LONG_REQUEST_TIMEOUT);

const getStatus = (): Promise<typeof Status.Type> =>
  call(({ GetStatus: getStatusRpc }) =>
    getStatusRpc().pipe(
      Effect.timeoutOrElse({
        duration: STATUS_TIMEOUT,
        orElse: () => Effect.fail({ message: UNREACHABLE }),
      }),
    ),
  );

const listSources = (): Promise<readonly (typeof Source.Type)[]> =>
  call(({ ListSources: listSourcesRpc }) => Effect.map(listSourcesRpc(), ({ sources }) => sources));

const addSource = (source: {
  readonly path: string;
  readonly kind: typeof SourceKind.Type;
}): Promise<typeof Source.Type> => call(({ AddSource: addSourceRpc }) => addSourceRpc(source));

const removeSource = (id: number): Promise<void> =>
  call(({ RemoveSource: removeSourceRpc }) => removeSourceRpc({ id }));

interface LibraryInfo {
  readonly path: string;
  readonly assetStore: Option.Option<string>;
  readonly blm: Option.Option<string>;
}

const getLibrary = (): Promise<LibraryInfo> =>
  call(({ GetLibrary: getLibraryRpc }) =>
    Effect.map(getLibraryRpc(), ({ path, assetStore, blm }) => ({
      path,
      assetStore: Option.fromNullOr(assetStore),
      blm: Option.fromNullOr(blm),
    })),
  );

const importFiles = (paths: readonly string[]): Promise<number> =>
  callLong(({ ImportFiles: importFilesRpc }) =>
    Effect.map(importFilesRpc({ paths }), ({ packages }) => packages),
  );

const listPackages = (): Promise<readonly (typeof Package.Type)[]> =>
  call(({ ListPackages: listPackagesRpc }) =>
    Effect.map(listPackagesRpc(), ({ packages }) => packages),
  );

const linkBooth = (link: {
  readonly packageId: number;
  readonly url: string;
}): Promise<typeof Package.Type> => call(({ LinkBooth: linkBoothRpc }) => linkBoothRpc(link));

const search = (query: {
  readonly query: string;
  readonly kinds: readonly (typeof AssetKind.Type)[];
  readonly limit: number;
  readonly packageId: number | null;
}): Promise<readonly (typeof SearchResult.Type)[]> =>
  call(({ Search: searchRpc }) => Effect.map(searchRpc(query), ({ results }) => results));

const listAssets = (query: {
  readonly packageId: number | null;
  readonly kinds: readonly (typeof AssetKind.Type)[];
  readonly offset: number;
  readonly limit: number;
}): Promise<Readonly<{ assets: readonly (typeof SearchResult.Type)[]; total: number }>> =>
  call(({ ListAssets: listAssetsRpc }) => listAssetsRpc(query));

const extract = (
  assetIds: readonly number[],
): Promise<Readonly<{ path: string; assets: number }>> =>
  callLong(({ Extract: extractRpc }) => extractRpc({ assetIds }));

const listRenderJobs = (): Promise<readonly Readonly<{ assetId: number; pathname: string }>[]> =>
  call(({ ListRenderJobs: listRenderJobsRpc }) =>
    Effect.map(listRenderJobsRpc(), ({ jobs }) => jobs),
  );

const readModel = (
  assetId: number,
): Promise<
  Readonly<{ model: Uint8Array; files: readonly Readonly<{ name: string; data: Uint8Array }>[] }>
> => call(({ ReadModel: readModelRpc }) => readModelRpc({ assetId }));

const putRender = (rendered: {
  readonly assetId: number;
  readonly pngs: readonly Uint8Array[];
}): Promise<void> => call(({ PutRender: putRenderRpc }) => putRenderRpc(rendered));

const encodeBase64 = Schema.encodeEffect(Schema.Uint8ArrayFromBase64);

const getPreview = (assetId: number): Promise<string> =>
  call(({ GetPreview: getPreviewRpc }) =>
    getPreviewRpc({ assetId }).pipe(
      Effect.flatMap(({ png }) => encodeBase64(png)),
      Effect.map((base64) => `data:image/png;base64,${base64}`),
    ),
  );

export {
  addSource,
  extract,
  getPreview,
  getLibrary,
  getStatus,
  importFiles,
  linkBooth,
  listAssets,
  listPackages,
  listRenderJobs,
  listSources,
  putRender,
  readModel,
  removeSource,
  search,
};
export type { LibraryInfo };
