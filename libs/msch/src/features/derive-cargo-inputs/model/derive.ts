import { Array as Arr, Effect, Layer, Option, Schema, Stream, pipe } from "effect";
import { ChildProcess } from "effect/process";

import { collectIgnoredDirectories } from "#/shared/lib/ignored-directories.ts";
import {
  NODE_MODULES,
  RepositoryFiles,
  nodeRepositoryFiles,
  nodeServicesLayer,
} from "#/shared/lib/repository-files.ts";

import { cargoInputsOf } from "./cargo-inputs.ts";
import type { CargoInput } from "./cargo-inputs.ts";
import { CargoMetadataSchema, CargoWorkspaceSchema, LOCK_FILE, keysOf } from "./cargo-metadata.ts";
import type { CargoWorkspace } from "./cargo-metadata.ts";

const KEY_SEPARATOR = "\u0000";
const READ_CONCURRENCY = 16;
const CACHE_FILE = [NODE_MODULES, ".cache", "msch", "cargo-workspace.json"] as const;
const METADATA_ARGS = ["metadata", "--format-version", "1", "--offline", "--locked"];

const CachedWorkspace = Schema.fromJsonString(
  Schema.Struct({
    fingerprint: Schema.String,
    keys: Schema.Array(Schema.String),
    workspace: CargoWorkspaceSchema,
  }),
);
const decodeMetadata = Schema.decodeUnknownEffect(Schema.fromJsonString(CargoMetadataSchema));
const decodeCached = Schema.decodeUnknownOption(CachedWorkspace);
const encodeCached = Schema.encodeEffect(CachedWorkspace);

const AUTO: readonly CargoInput[] = [{ auto: true }];
const nodeLayer = Layer.provideMerge(nodeRepositoryFiles, nodeServicesLayer);

export interface CargoInputOptions {
  readonly directory: string;
  readonly extras?: readonly string[];
}

const fingerprintOf = Effect.fn("fingerprintOf")(function* fingerprintOf(
  root: string,
  keys: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const texts = yield* Effect.forEach(keys, (key) => files.readFile(files.join(root, key)), {
    concurrency: READ_CONCURRENCY,
  });
  const joined = pipe(
    keys,
    Arr.zip(texts),
    Arr.map(([key, text]) => `${key}${KEY_SEPARATOR}${Option.getOrElse(text, () => "")}`),
    Arr.join(KEY_SEPARATOR),
  );
  return yield* files.hash(joined);
});

const cachedWorkspace = Effect.fn("cachedWorkspace")(function* cachedWorkspace(root: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, ...CACHE_FILE));
  const cached = pipe(text, Option.flatMap(decodeCached));
  if (Option.isNone(cached)) {
    return Option.none<CargoWorkspace>();
  }
  const fingerprint = yield* fingerprintOf(root, cached.value.keys);
  return Option.some(cached.value.workspace).pipe(
    Option.filter(() => fingerprint === cached.value.fingerprint),
  );
});

const readWorkspace = Effect.fn("readWorkspace")(function* readWorkspace(root: string) {
  const files = yield* RepositoryFiles;
  const handle = yield* ChildProcess.make("cargo", METADATA_ARGS, {
    cwd: root,
    extendEnv: true,
    stdin: "ignore",
  });
  const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
  const metadata = yield* decodeMetadata(output);
  const workspace: CargoWorkspace = {
    metadata,
    ignored: yield* collectIgnoredDirectories(root),
  };
  const keys = keysOf(metadata);
  const fingerprint = yield* fingerprintOf(root, keys);
  const text = yield* encodeCached({ fingerprint, keys, workspace });
  yield* files.writeFile(files.join(root, ...CACHE_FILE), text);
  return workspace;
}, Effect.scoped);

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

const inputsIn = Effect.fn("inputsIn")(function* inputsIn(
  root: string,
  directory: string,
  extras: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const cached = yield* cachedWorkspace(root);
  const workspace = yield* Option.match(cached, {
    onNone: () => readWorkspace(root),
    onSome: Effect.succeed,
  });
  const derived = cargoInputsOf({ workspace, directory, extras });
  const file = files.join(root, derived.closureFile);
  const written = yield* files.readFile(file);
  if (!Option.exists(written, (text) => text === derived.closure)) {
    yield* files.writeFile(file, derived.closure);
  }
  return derived.inputs;
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
  Effect.runPromise(
    deriveCargoInputs(options).pipe(
      Effect.orElseSucceed(() => AUTO),
      Effect.provide(nodeLayer),
    ),
  );
