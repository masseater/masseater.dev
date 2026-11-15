import { Array, Effect, FileSystem, HashMap, Option, Path, Schema, String, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { bundleFolder, hasExtension, mentionedIn } from "#entities/package";
import type { Folder } from "#entities/package";
import { blendModel } from "#shared/blend";
import { Settings } from "#shared/settings";
import { decodeRows } from "#shared/sql";
import { extractAssets } from "#shared/unitypackage";

const STAGING = "render";
const RENDERED = "model";
const GLB = ".glb";
const UNITY_PACKAGE = "unitypackage";
const EXTRACTED_BLEND = "source.blend";

const ModelRow = Schema.Struct({
  file: Schema.NullOr(Schema.String),
  guid: Schema.String,
  pathname: Schema.String,
  package_id: Schema.Int,
  package_path: Schema.String,
  package_kind: Schema.String,
});

const NameRow = Schema.Struct({ guid: Schema.String, pathname: Schema.String });

type Model = typeof ModelRow.Type;

type Name = typeof NameRow.Type;

interface Source {
  readonly main: string;
  readonly folder: Folder;
}

interface Staging {
  readonly model: Model;
  readonly staging: string;
}

const isBlend = hasExtension(".blend");

const isMaterial = hasExtension(".mtl");

const isPackaged = (model: Model): boolean => model.package_kind === UNITY_PACKAGE;

const isStaged = (model: Model): boolean => isPackaged(model) || isBlend(model.pathname);

const modelOf = Effect.fn("modelOf")(function* findModel(assetId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(ModelRow)(
    sql`select a.file, a.guid, a.pathname, a.package_id,
        p.path as package_path, p.kind as package_kind
      from assets a join packages p on p.id = a.package_id
      where a.id = ${assetId} and (a.file is not null or p.kind = ${UNITY_PACKAGE})`,
  );
  return yield* Effect.fromOption(Array.head(rows));
});

const stagingRoot = Effect.gen(function* stagingRoot() {
  const { dataDirectory } = yield* Settings;
  const path = yield* Path.Path;
  return path.join(dataDirectory, STAGING);
});

const stagingOf = Effect.fn("stagingOf")(function* stagingOf(assetId: number) {
  const path = yield* Path.Path;
  const root = yield* stagingRoot;
  return path.join(root, assetId.toString());
});

const renderedName = (path: Path.Path, model: Model): string => {
  if (isBlend(model.pathname)) {
    return `${RENDERED}${GLB}`;
  }
  return `${RENDERED}${pipe(path.extname(model.pathname), String.toLowerCase)}`;
};

/** @internal */
const sourceOf = Effect.fn("sourceOf")(function* sourceOf(assetId: number) {
  const path = yield* Path.Path;
  const model = yield* modelOf(assetId);
  if (!isStaged(model)) {
    const folder = yield* bundleFolder(model.package_path);
    return { main: model.file ?? "", folder } satisfies Source;
  }
  const staging = yield* stagingOf(assetId);
  const folder: Folder = { path: staging, recursive: false };
  return { main: path.join(staging, renderedName(path, model)), folder } satisfies Source;
});

const packageNames = Effect.fn("packageNames")(function* packageNames(model: Model) {
  const sql = yield* SqlClient.SqlClient;
  return yield* decodeRows(NameRow)(
    sql`select guid, pathname from assets
      where package_id = ${model.package_id} and guid != ${model.guid}`,
  );
});

const mentionedBy = Effect.fn("mentionedBy")(function* mentionedBy(
  sources: readonly string[],
  candidates: readonly Name[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = pipe(
    candidates,
    Array.map(({ pathname }) => pathname),
  );
  const mentioned = yield* pipe(
    sources,
    Effect.forEach((source) =>
      Effect.flatMap(fileSystem.readFile(source), (bytes) => mentionedIn({ bytes, names })),
    ),
  );
  return pipe(
    candidates,
    Array.filter(({ pathname }) => pipe(mentioned, Array.some(Array.contains(pathname)))),
    Array.dedupeWith(
      (left, right) => path.basename(left.pathname) === path.basename(right.pathname),
    ),
  );
});

const extractMentioned = Effect.fn("extractMentioned")(function* extractMentioned(
  { model, staging }: Staging,
  sources: readonly string[],
) {
  const path = yield* Path.Path;
  const candidates = yield* packageNames(model);
  const wanted = yield* mentionedBy(sources, candidates);
  const destinations = pipe(
    wanted,
    Array.map(({ guid, pathname }) => [guid, path.join(staging, path.basename(pathname))] as const),
  );
  yield* extractAssets({
    path: model.package_path,
    destinations: HashMap.fromIterable(destinations),
  });
  return pipe(
    destinations,
    Array.map(([, destination]) => destination),
  );
});

const extractCompanions = Effect.fn("extractCompanions")(function* extractCompanions(
  staged: Staging,
  main: string,
) {
  const direct = yield* extractMentioned(staged, [main]);
  const materials = pipe(direct, Array.filter(isMaterial));
  yield* Array.match(materials, {
    onEmpty: () => Effect.void,
    onNonEmpty: (sources) => extractMentioned(staged, sources),
  });
});

const extractModel = Effect.fn("extractModel")(function* extractModel(
  { model, staging }: Staging,
  main: string,
) {
  const path = yield* Path.Path;
  if (!isPackaged(model)) {
    return model.file ?? "";
  }
  const target = Option.match(Option.liftPredicate(model.pathname, isBlend), {
    onNone: () => main,
    onSome: () => path.join(staging, EXTRACTED_BLEND),
  });
  yield* extractAssets({
    path: model.package_path,
    destinations: HashMap.make([model.guid, target]),
  });
  return target;
});

const freshStaging = Effect.fn("freshStaging")(function* freshStaging(assetId: number) {
  const fileSystem = yield* FileSystem.FileSystem;
  const root = yield* stagingRoot;
  const staging = yield* stagingOf(assetId);
  yield* fileSystem.remove(root, { recursive: true, force: true });
  yield* fileSystem.makeDirectory(staging, { recursive: true });
  return staging;
});

/** @internal */
const stage = Effect.fn("stage")(function* stage(assetId: number) {
  const fileSystem = yield* FileSystem.FileSystem;
  const model = yield* modelOf(assetId);
  if (!isStaged(model)) {
    return;
  }
  const staged = { model, staging: yield* freshStaging(assetId) };
  const { main } = yield* sourceOf(assetId);
  const extracted = yield* extractModel(staged, main);
  yield* Option.match(Option.liftPredicate(model.pathname, isBlend), {
    onNone: () => extractCompanions(staged, main),
    onSome: () => Effect.flatMap(blendModel(extracted), (glb) => fileSystem.writeFile(main, glb)),
  });
});

/** @internal */
const discardStaging = Effect.fn("discardStaging")(function* discardStaging(assetId: number) {
  const fileSystem = yield* FileSystem.FileSystem;
  const staging = yield* stagingOf(assetId);
  yield* fileSystem.remove(staging, { recursive: true, force: true });
});

export { discardStaging, sourceOf, stage };
