import process from "node:process";

import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { fetchModel } from "#shared/embedding";

const RESOURCES = "../aredoko-desktop/src-tauri/resources";
const BUNDLE = "dist";
const BUNDLE_EXTENSION = ".mjs";
const EXTERNAL = ["@huggingface/transformers", "sqlite-vec"];
const FOREIGN_PLATFORMS: ReadonlySet<string> = new Set(["linux", "darwin"]);
const ONNX_BINARIES = "node_modules/onnxruntime-node/bin";
const WORKSPACE = `nodeLinker: hoisted
allowBuilds:
  onnxruntime-node: false
  protobufjs: false
`;
const SUCCESS = 0;
const INSTALL = "vp install --prod --no-frozen-lockfile";

const taggedError = Schema.TaggedError;

class InstallFailed extends taggedError<InstallFailed, { readonly brand: unique symbol }>()(
  "InstallFailed",
  { message: Schema.String },
) {}

const Version = Schema.Struct({ version: Schema.String });
const ServerManifest = Schema.Struct({
  name: Schema.String,
  private: Schema.Boolean,
  type: Schema.String,
  dependencies: Schema.Record(Schema.String, Schema.String),
});

const versionOf = Effect.fn("versionOf")(function* versionOf(name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(`node_modules/${name}/package.json`);
  const { version } = yield* Schema.decodeEffect(Schema.fromJsonString(Version))(text);
  return [name, version] as const;
});

const copyServer = Effect.fn("copyServer")(function* copyServer(server: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fileSystem.readDirectory(BUNDLE);
  const bundled = pipe(files, Arr.filter(Str.endsWith(BUNDLE_EXTENSION)));
  yield* Effect.forEach(
    bundled,
    (file) => fileSystem.copyFile(path.join(BUNDLE, file), path.join(server, file)),
    { discard: true },
  );
  const versions = yield* pipe(
    EXTERNAL,
    Effect.forEach((name) => versionOf(name)),
  );
  const manifest = yield* Schema.encodeEffect(Schema.fromJsonString(ServerManifest))({
    name: "aredoko-server",
    private: true,
    type: "module",
    dependencies: Rec.fromEntries(versions),
  });
  yield* fileSystem.writeFileString(path.join(server, "package.json"), manifest);
  yield* fileSystem.writeFileString(path.join(server, "pnpm-workspace.yaml"), WORKSPACE);
});

const installServer = Effect.fn("installServer")(function* installServer(server: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(INSTALL, [], {
      cwd: server,
      shell: true,
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  if (Number(exitCode) !== SUCCESS) {
    return yield* InstallFailed.make({ message: `vp install exited with ${String(exitCode)}` });
  }
  return exitCode;
});

const dropForeignBinaries = Effect.fn("dropForeignBinaries")(function* dropForeignBinaries(
  server: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const binaries = path.join(server, ONNX_BINARIES);
  const entries = yield* fileSystem.readDirectory(binaries, { recursive: true });
  const foreign = pipe(
    entries,
    Arr.filter((entry) => FOREIGN_PLATFORMS.has(path.basename(entry))),
  );
  yield* Effect.forEach(
    foreign,
    (entry) => fileSystem.remove(path.join(binaries, entry), { recursive: true, force: true }),
    { discard: true },
  );
});

const copyRuntime = Effect.fn("copyRuntime")(function* copyRuntime(runtime: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.makeDirectory(runtime, { recursive: true });
  yield* fileSystem.copyFile(process.execPath, path.join(runtime, "node.exe"));
});

const prepare = Effect.fn("prepareInstallerResources")(function* prepare() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const resources = path.resolve(RESOURCES);
  const server = path.join(resources, "server");
  yield* fileSystem.makeDirectory(server, { recursive: true });
  yield* copyRuntime(path.join(resources, "runtime"));
  yield* copyServer(server);
  yield* installServer(server);
  yield* dropForeignBinaries(server);
  yield* fetchModel(path.join(resources, "models"));
});

runMain("aredoko-installer-resources")(prepare());
