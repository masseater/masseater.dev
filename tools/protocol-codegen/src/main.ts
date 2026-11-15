import { checkRust, effect2rs } from "@masseater.dev/effect2rs";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, FileSystem, Path, Schema, String as Str, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { csharp } from "./csharp.ts";
import { rustOutputs } from "./rust.ts";
import type { RustOutput } from "./rust.ts";
import { sts2 } from "./sts2.ts";

const CSHARP_OUTPUT =
  "../../apps/aredoko-unity/Packages/dev.masseater.aredoko/Editor/Protocol/Protocol.g.cs";
const STS2_OUTPUT = "../../apps/sts2-mods/mods/AgentBridge/AgentBridgeCode/Protocol.g.cs";
const TAURI_CONFIG = new URL(
  "../../../apps/aredoko-desktop/src-tauri/tauri.conf.json",
  import.meta.url,
);

const decodeTauriConfig = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Struct({ identifier: Schema.String })),
);

const taggedError = Schema.TaggedError;

class StaleProtocol extends taggedError<StaleProtocol, { readonly brand: unique symbol }>()(
  "StaleProtocol",
  { path: Schema.String },
) {}

const appIdentifier = Effect.fn("appIdentifier")(function* appIdentifier() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const configPath = yield* path.fromFileUrl(TAURI_CONFIG);
  const config = yield* fileSystem.readFileString(configPath);
  const { identifier } = yield* decodeTauriConfig(config);
  return identifier;
});

type Output = Readonly<{ path: string; source: string }>;

const write = Effect.fn("write")(function* write({ path: output, source }: Output) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.makeDirectory(path.dirname(output), { recursive: true });
  yield* fileSystem.writeFileString(output, source);
});

const verify = Effect.fn("verify")(function* verify({ path: output, source }: Output) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* Effect.filterOrFail(
    fileSystem.readFileString(output),
    (current) => current === source,
    () => StaleProtocol.make({ path: output }),
  );
});

const RUST_FILE = ".rs";

const writeRust = Effect.fn("writeRust")(function* writeRust(target: RustOutput) {
  const source = yield* effect2rs(target);
  yield* write({ path: target.output, source });
});

const readRust = Effect.fn("readRust")(function* readRust(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const source = yield* fileSystem.readFileString(file);
  return { path: file, source };
});

const siblingsOf = Effect.fn("siblingsOf")(function* siblingsOf(output: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.dirname(output);
  const entries = yield* fileSystem.readDirectory(directory, { recursive: true });
  const files = pipe(
    entries,
    Arr.filter(Str.endsWith(RUST_FILE)),
    Arr.map((entry) => path.join(directory, entry)),
    Arr.filter((file) => path.resolve(file) !== path.resolve(output)),
    Arr.sortBy(Str.Order),
  );
  return yield* pipe(files, Effect.forEach(readRust));
});

const checkRustOutput = Effect.fn("checkRustOutput")(function* checkRustOutput(target: RustOutput) {
  const fileSystem = yield* FileSystem.FileSystem;
  const current = yield* Effect.option(fileSystem.readFileString(target.output));
  const siblings = yield* siblingsOf(target.output);
  yield* checkRust({ ...target, path: target.output, current, siblings });
});

const command = Command.make(
  "protocol-codegen",
  { check: Flag.Boolean("check").pipe(Flag.withDefault(false)) },
  ({ check }) =>
    Effect.gen(function* codegen() {
      const identifier = yield* appIdentifier();
      const csharpSource = yield* csharp(identifier);
      const sts2Source = yield* sts2();
      const rust = yield* rustOutputs;
      const outputs: readonly Output[] = [
        { path: CSHARP_OUTPUT, source: csharpSource },
        { path: STS2_OUTPUT, source: sts2Source },
      ];
      if (check) {
        yield* Effect.forEach(rust, checkRustOutput, { discard: true });
        return yield* Effect.forEach(outputs, verify, { discard: true });
      }
      yield* Effect.forEach(rust, writeRust, { discard: true });
      return yield* Effect.forEach(outputs, write, { discard: true });
    }),
);

runMain("protocol-codegen")(Command.run(command, { version: "0.0.0" }));
