import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Path, Schema } from "effect";
import { Command, Flag } from "effect/cli";

import { csharp } from "./csharp.ts";
import { rust } from "./rust.ts";

const CSHARP_OUTPUT =
  "../../apps/aredoko-unity/Packages/dev.masseater.aredoko/Editor/Protocol/Protocol.g.cs";
const RUST_OUTPUT = "../../apps/aredoko-desktop/src-tauri/src/protocol.rs";
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

const command = Command.make(
  "protocol-codegen",
  { check: Flag.Boolean("check").pipe(Flag.withDefault(false)) },
  ({ check }) =>
    Effect.gen(function* codegen() {
      const identifier = yield* appIdentifier();
      const csharpSource = yield* csharp(identifier);
      const outputs: readonly Output[] = [
        { path: CSHARP_OUTPUT, source: csharpSource },
        { path: RUST_OUTPUT, source: rust() },
      ];
      if (check) {
        return yield* Effect.forEach(outputs, verify, { discard: true });
      }
      return yield* Effect.forEach(outputs, write, { discard: true });
    }),
);

runMain("protocol-codegen")(Command.run(command, { version: "0.0.0" }));
