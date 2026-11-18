import {
  Array as Arr,
  Console,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess } from "effect/process";

import { collectIgnoredDirectories } from "#/shared/lib/ignored-directories.ts";
import {
  RepositoryFiles,
  nodeRepositoryFiles,
  nodeServicesLayer,
} from "#/shared/lib/repository-files.ts";
import { startedOnce } from "#/shared/lib/started-once.ts";

import { cargoInputsOf } from "./cargo-inputs.ts";
import type { CargoInput, DerivedInputs } from "./cargo-inputs.ts";
import {
  CargoMetadataSchema,
  CargoSourceSchema,
  LOCK_FILE,
  MANIFEST_FILE,
  WORKSPACE_CACHE,
} from "./cargo-metadata.ts";
import type { CargoSource, CargoWorkspace } from "./cargo-metadata.ts";
import { readManifest } from "./root-manifest.ts";

const KEY_SEPARATOR = "\u0000";
const SUCCESS = 0;
const KEYS = [LOCK_FILE, MANIFEST_FILE] as const;
const METADATA_ARGS = ["metadata", "--format-version", "1", "--offline", "--locked"];

const CachedSource = Schema.fromJsonString(
  Schema.Struct({
    fingerprint: Schema.String,
    source: CargoSourceSchema,
  }),
);
const decodeMetadata = Schema.decodeUnknownEffect(Schema.fromJsonString(CargoMetadataSchema));
const decodeCached = Schema.decodeUnknownOption(CachedSource);
const encodeCached = Schema.encodeEffect(CachedSource);

const taggedError = Schema.TaggedError;

class MetadataFailed extends taggedError<MetadataFailed, { readonly brand: unique symbol }>()(
  "MetadataFailed",
  { output: Schema.String },
) {}

const AUTO: readonly CargoInput[] = [{ auto: true }];
const nodeLayer = Layer.provideMerge(nodeRepositoryFiles, nodeServicesLayer);

export interface CargoInputOptions {
  readonly directory: string;
  readonly extras?: readonly string[];
}

const fingerprintOf = Effect.fn("fingerprintOf")(function* fingerprintOf(root: string) {
  const files = yield* RepositoryFiles;
  const texts = yield* Effect.forEach(KEYS, (key) => files.readFile(files.join(root, key)), {
    concurrency: "unbounded",
  });
  return yield* files.hash(
    pipe(
      texts,
      Arr.map((text) => Option.getOrElse(text, () => "")),
      Arr.join(KEY_SEPARATOR),
    ),
  );
});

const cachedSource = Effect.fn("cachedSource")(function* cachedSource(root: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, WORKSPACE_CACHE));
  const fingerprint = yield* fingerprintOf(root);
  return text.pipe(
    Option.flatMap(decodeCached),
    Option.filter((cached) => cached.fingerprint === fingerprint),
    Option.map((cached) => cached.source),
  );
});

const metadataIn = Effect.fn("metadataIn")(function* metadataIn(root: string) {
  const handle = yield* ChildProcess.make("cargo", METADATA_ARGS, {
    cwd: root,
    extendEnv: true,
    stdin: "ignore",
  });
  const [output, problem] = yield* Effect.all(
    [
      handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
      handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
    ],
    { concurrency: "unbounded" },
  );
  const code = yield* handle.exitCode;
  if (code !== SUCCESS) {
    return yield* MetadataFailed.make({ output: Str.trim(problem) });
  }
  return yield* decodeMetadata(output);
}, Effect.scoped);

const readSource = Effect.fn("readSource")(function* readSource(root: string) {
  const files = yield* RepositoryFiles;
  const source: CargoSource = {
    metadata: yield* metadataIn(root),
    manifest: yield* readManifest(root),
  };
  const text = yield* encodeCached({ fingerprint: yield* fingerprintOf(root), source });
  yield* files.writeFile(files.join(root, WORKSPACE_CACHE), text);
  return source;
});

const workspaceIn = Effect.fn("workspaceIn")(function* workspaceIn(root: string) {
  const cached = yield* cachedSource(root);
  const source = yield* Option.match(cached, {
    onNone: () => readSource(root),
    onSome: Effect.succeed,
  });
  const workspace: CargoWorkspace = {
    ...source,
    ignored: yield* collectIgnoredDirectories(root),
  };
  return workspace;
});

const warn = (root: string, reason: string): Effect.Effect<void> =>
  Console.error(
    `msch: the cargo workspace in ${root} could not be read, so its cargo tasks track every file they read: ${reason}`,
  );

const loaded = (
  root: string,
): Effect.Effect<Option.Option<CargoWorkspace>, never, Layer.Success<typeof nodeLayer>> =>
  workspaceIn(root).pipe(
    Effect.asSome,
    Effect.catchTag("MetadataFailed", ({ output }) => Effect.fail(output)),
    Effect.tapError((cause) => warn(root, String(cause))),
    Effect.orElseSucceed(() => Option.none<CargoWorkspace>()),
  );

const loadedOnce = startedOnce<Option.Option<CargoWorkspace>>();

const loadWorkspace = (root: string): Promise<Option.Option<CargoWorkspace>> =>
  loadedOnce(root, () => Effect.runPromise(loaded(root).pipe(Effect.provide(nodeLayer))));

const lockDirectory = (
  directory: string,
): Effect.Effect<Option.Option<string>, never, RepositoryFiles> =>
  Effect.gen(function* findLockDirectory() {
    const files = yield* RepositoryFiles;
    if (yield* files.exists(files.join(directory, LOCK_FILE))) {
      return Option.some(directory);
    }
    const parent = files.dirname(directory);
    if (parent === directory) {
      return Option.none<string>();
    }
    return yield* lockDirectory(parent);
  });

const writeClosure = Effect.fn("writeClosure")(function* writeClosure(
  root: string,
  derived: DerivedInputs,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, derived.closureFile);
  const written = yield* files.readFile(file);
  if (!Option.exists(written, (text) => text === derived.closure)) {
    yield* files.writeFile(file, derived.closure);
  }
  return derived.inputs;
});

const inputsIn = Effect.fn("inputsIn")(function* inputsIn(
  root: string,
  directory: string,
  extras: readonly string[],
) {
  const workspace = yield* Effect.promise(() => loadWorkspace(root));
  return yield* Option.match(workspace, {
    onNone: () => Effect.succeed(AUTO),
    onSome: (found) => writeClosure(root, cargoInputsOf({ workspace: found, directory, extras })),
  });
});

const deriveCargoInputs = Effect.fn("deriveCargoInputs")(function* deriveCargoInputs({
  directory,
  extras = [],
}: CargoInputOptions) {
  const files = yield* RepositoryFiles;
  const absolute = files.resolve(directory);
  const root = yield* lockDirectory(absolute);
  return yield* Option.match(root, {
    onNone: () => Effect.succeed(AUTO),
    onSome: (found) => inputsIn(found, absolute, extras),
  });
});

export const cargoInputs = (options: CargoInputOptions): Promise<readonly CargoInput[]> =>
  Effect.runPromise(deriveCargoInputs(options).pipe(Effect.provide(nodeLayer)));
