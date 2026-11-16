import { NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, Record as Rec, Schema, pipe } from "effect";
import { parse } from "smol-toml";
import { defineConfig } from "vite-plus";

const Manifest = Schema.Struct({ dependencies: Schema.Record(Schema.String, Schema.Unknown) });
const decodeManifest = Schema.decodeUnknownEffect(Manifest);

const crates = await Effect.runPromise(
  Effect.gen(function* crates() {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* fs.readFileString(new URL("./Cargo.toml", import.meta.url).pathname);
    const manifest = yield* decodeManifest(parse(text));
    return Rec.keys(manifest.dependencies);
  }).pipe(Effect.provide(NodeServices.layer)),
);

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["build"] },
      build: {
        command: pipe(
          crates,
          Arr.map((crate) => `-p ${crate}`),
          Arr.prepend("cargo build --release --locked"),
          Arr.join(" "),
        ),
        cache: {
          input: [
            "Cargo.toml",
            "Cargo.lock",
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: ["target/release/*"],
        },
      },
    },
  },
});
