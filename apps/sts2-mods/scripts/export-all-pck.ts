#!/usr/bin/env node
import { mustSucceed, outputOf, sha256Of } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

const MEGADOT_VERSION = "4.5.1-m.14";
const MEGADOT_SHA256 = "d245de0cd79ebffa83c87ae505e944fefd6beafd1496e9ce413f3a6c272dec3c";
const MEGADOT_URL = `https://megadot.megacrit.com/${MEGADOT_VERSION}/megadot-${MEGADOT_VERSION}-linux-x86_64-editor-csharp.zip`;
const MEGADOT_BINARY = /^MegaDot_.*_mono_linux\.x86_64$/u;
const SDK_LINE = /\[(?<sdk>[^\]]+)\]$/u;

const taggedError = Schema.TaggedError;

class MegaDotUnavailable extends taggedError<
  MegaDotUnavailable,
  { readonly brand: unique symbol }
>()("MegaDotUnavailable", { message: Schema.String }) {}

const verifiedArchive = Effect.gen(function* verifiedArchive() {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(MEGADOT_URL);
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  const buffer = yield* ok.arrayBuffer;
  const archive = new Uint8Array(buffer);
  const digest = yield* sha256Of([archive]);
  if (digest !== MEGADOT_SHA256) {
    return yield* MegaDotUnavailable.make({ message: `${MEGADOT_URL} has sha256 ${digest}` });
  }
  return archive;
});

const downloadMegaDot = Effect.fn("downloadMegaDot")(function* downloadMegaDot(directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const archive = yield* verifiedArchive;
  const zip = path.join(directory, "megadot.zip");
  yield* fs.makeDirectory(directory, { recursive: true });
  yield* fs.writeFile(zip, archive);
  yield* mustSucceed({
    command: "unzip",
    args: ["-q", zip, "-d", directory, "-x", "*.debugsymbols"],
  });
  yield* fs.remove(zip);
});

const binaryIn = Effect.fn("binaryIn")(function* binaryIn(directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fs.readDirectory(directory);
  const binary = pipe(
    names,
    Arr.findFirst((name) => MEGADOT_BINARY.test(name)),
  );
  return yield* Option.match(binary, {
    onNone: () => MegaDotUnavailable.make({ message: `${directory} has no MegaDot binary` }),
    onSome: (name) => Effect.succeed(path.join(directory, name)),
  });
});

const downloadedMegaDot = Effect.gen(function* downloadedMegaDot() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temporary = yield* Config.String("RUNNER_TEMP").pipe(
    Config.orElse(() => Config.String("TMPDIR")),
    Config.withDefault("/tmp"),
  );
  const directory = path.join(temporary, `megadot-${MEGADOT_VERSION}`);
  const downloaded = yield* fs.exists(directory);
  if (!downloaded) {
    yield* downloadMegaDot(directory);
  }
  return yield* binaryIn(directory);
});

const megaDot = Config.String("GODOT_PATH").pipe(
  Config.option,
  Effect.flatMap(
    Option.match({
      onNone: () => downloadedMegaDot,
      onSome: Effect.succeed,
    }),
  ),
);

const sdkOf = (line: string): Option.Option<string> =>
  pipe(
    Str.match(SDK_LINE)(Str.trim(line)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(Rec.get("sdk")),
  );

const dotnetRoot = Effect.gen(function* dotnetRoot() {
  const path = yield* Path.Path;
  const sdks = yield* outputOf({ command: "dotnet", args: ["--list-sdks"] });
  const sdk = pipe(
    Str.split("\n")(sdks),
    Arr.flatMap((line) => Option.toArray(sdkOf(line))),
    Arr.head,
  );
  return yield* Option.match(sdk, {
    onNone: () => MegaDotUnavailable.make({ message: "dotnet lists no SDK" }),
    onSome: (directory) => Effect.succeed(path.dirname(directory)),
  });
});

const modsWithAssets = Effect.fn("modsWithAssets")(function* modsWithAssets(root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const mods = path.join(root, "mods");
  const names = yield* fs.readDirectory(mods);
  return yield* pipe(
    names,
    Effect.filter((name) => fs.exists(path.join(mods, name, name))),
  );
});

const exportAllPck = Effect.gen(function* exportAllPck() {
  const path = yield* Path.Path;
  const root = path.resolve(import.meta.dirname, "..");
  const out = yield* Config.String("PCK_OUT").pipe(Config.withDefault(path.join(root, "out")));
  const godot = yield* megaDot;
  const DOTNET_ROOT = yield* dotnetRoot;
  const mods = yield* modsWithAssets(root);
  yield* Effect.forEach(
    mods,
    (mod) =>
      mustSucceed({
        command: "dotnet",
        args: [
          "msbuild",
          path.join(root, "mods", mod, `${mod}.csproj`),
          "-restore",
          "-t:ExportPck",
          "-p:SkipSts2Check=true",
          "-nologo",
          "-v:m",
          `-p:GodotPath=${godot}`,
          `-p:PckOutputDir=${path.join(out, mod)}/`,
        ],
        env: { DOTNET_ROOT },
      }),
    { discard: true },
  );
});

runMain("export-all-pck")(exportAllPck);
