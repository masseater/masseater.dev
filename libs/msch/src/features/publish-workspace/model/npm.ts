import { mustSucceed } from "@masseater.dev/github-workflow";
import {
  Array as Arr,
  Boolean as Bool,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Record as Rec,
  Schema,
  pipe,
} from "effect";

import { brokerCredential } from "./broker.ts";
import { onNpm } from "./dependencies.ts";
import { manifestIn } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { nativeFields, nativeFileOf, nativeReadme } from "./platforms.ts";
import type { NativePackage } from "./platforms.ts";
import { widenRangesEnv } from "./widened-ranges.ts";

const TARBALL = "package.tgz";
const NPM_DIR = "npm";
const NATIVE_DIR = "native";
const MANIFEST_FILE = "package.json";
const KEPT_FIELDS: readonly string[] = ["license", "repository", "homepage", "bugs", "engines"];
const PUBLISH_FLAGS = ["--provenance", "--access", "public"];

type Env = Readonly<Record<string, string>>;

const PackageJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const PlatformManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, version: Schema.String }),
);
const authEnv = Effect.fn("publish.authEnv")(function* authEnv() {
  const token = yield* brokerCredential({ kind: "npm", field: "npmToken" });
  return Option.match(token, {
    onNone: (): Env => ({}),
    onSome: (value): Env => ({ NODE_AUTH_TOKEN: value }),
  });
});

const verifyPackage = Effect.fn("publish.verify")(function* verifyPackage(
  directory: string,
  manifest: Manifest,
) {
  const size = pipe(
    Option.fromUndefinedOr(manifest["size-limit"]),
    Option.map(() => "size"),
    Option.toArray,
  );
  const tasks = ["build", "test", ...size];
  yield* Effect.forEach(
    tasks,
    (task) => mustSucceed({ command: "vp", args: ["run", task], cwd: directory }),
    { concurrency: 1, discard: true },
  );
});

const keptFields = Effect.fn("publish.keptFields")(function* keptFields(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, MANIFEST_FILE));
  const raw = yield* Schema.decodeEffect(PackageJson)(text);
  return pipe(
    raw,
    Rec.filter((_value, key) => Arr.contains(KEPT_FIELDS, key)),
  );
});

const placeNative = Effect.fn("publish.placeNative")(function* placeNative(
  from: string,
  target: string,
  native: NativePackage,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = nativeFileOf(native);
  const source = path.join(from, file);
  return yield* Bool.match(native.archive, {
    onFalse: () => fileSystem.copyFile(source, path.join(target, file)),
    onTrue: () => mustSucceed({ command: "tar", args: ["-xzf", source, "-C", target] }),
  });
});

const writeNative = Effect.fn("publish.writeNative")(function* writeNative(
  directory: string,
  native: NativePackage,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const kept = yield* keptFields(directory);
  const target = path.resolve(directory, NPM_DIR, native.target);
  yield* fileSystem.makeDirectory(target, { recursive: true });
  yield* placeNative(path.join(directory, NATIVE_DIR), target, native);
  const text = yield* Schema.encodeEffect(PackageJson)({ ...kept, ...nativeFields(native) });
  yield* Effect.all(
    [
      fileSystem.writeFileString(path.join(target, MANIFEST_FILE), text),
      fileSystem.writeFileString(path.join(target, "README.md"), nativeReadme(native)),
    ],
    { concurrency: "unbounded" },
  );
  return target;
});

const publishNative = Effect.fn("publish.publishNative")(function* publishNative(
  target: string,
  env: Env,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { name, version } = yield* fileSystem
    .readFileString(path.join(target, MANIFEST_FILE))
    .pipe(Effect.flatMap(Schema.decodeEffect(PlatformManifest)));
  if (yield* onNpm({ directory: target, name, version })) {
    yield* Console.log(`${name}@${version} is already published, skipping`);
    return name;
  }
  yield* mustSucceed({
    command: "npm",
    args: ["publish", ".", ...PUBLISH_FLAGS],
    env,
    cwd: target,
  });
  return name;
});

const addOptionalDependencies = Effect.fn("publish.optionalDependencies")(
  function* addOptionalDependencies(directory: string, names: readonly string[], version: string) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = path.join(directory, MANIFEST_FILE);
    const manifest = yield* fileSystem
      .readFileString(file)
      .pipe(Effect.flatMap(Schema.decodeEffect(PackageJson)));
    const optionalDependencies = pipe(
      names,
      Arr.map((name): readonly [string, string] => [name, version]),
      Rec.fromEntries,
    );
    const updated = yield* Schema.encodeEffect(PackageJson)({ ...manifest, optionalDependencies });
    yield* fileSystem.writeFileString(file, updated);
  },
);

const publishNatives = Effect.fn("publish.publishNatives")(function* publishNatives(
  directory: string,
  manifest: Manifest,
  env: Env,
) {
  if (Predicate.isUndefined(manifest.native)) {
    return;
  }
  const { binary, targets, archive = false } = manifest.native;
  const written = yield* Effect.forEach(
    targets,
    (target) =>
      writeNative(directory, {
        name: manifest.name,
        version: manifest.version,
        binary,
        target,
        archive,
      }),
    { concurrency: 1 },
  );
  const names = yield* Effect.forEach(written, (target) => publishNative(target, env), {
    concurrency: 1,
  });
  yield* addOptionalDependencies(directory, names, manifest.version);
});

const pack = Effect.fn("publish.pack")(function* pack(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temporary = yield* fileSystem.makeTempDirectoryScoped();
  const tarball = path.join(temporary, TARBALL);
  const env = yield* widenRangesEnv(temporary);
  yield* mustSucceed({
    command: "vp",
    args: ["pm", "pack", "--out", tarball],
    env,
    cwd: directory,
  });
  return tarball;
});

/** @internal */
export const publishToNpm = Effect.fn("publish.npm")(function* publishToNpm(directory: string) {
  const manifest = yield* manifestIn(directory);
  if (yield* onNpm({ directory, ...manifest })) {
    return yield* Console.log(`${manifest.name}@${manifest.version} is already published`);
  }
  const env = yield* authEnv();
  yield* verifyPackage(directory, manifest);
  yield* publishNatives(directory, manifest, env);
  const tarball = yield* pack(directory);
  return yield* mustSucceed({
    command: "npm",
    args: ["publish", tarball, ...PUBLISH_FLAGS],
    env,
    cwd: directory,
  });
}, Effect.scoped);
