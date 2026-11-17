import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, FileSystem, Option, Schema, String as Str, pipe } from "effect";

const RUNNERS = [
  { marker: "-linux-", runner: "ubuntu-latest" },
  { marker: "-windows-", runner: "windows-latest" },
  { marker: "-apple-", runner: "macos-latest" },
] as const;

const Napi = Schema.Struct({ targets: Schema.Array(Schema.String) });

const Manifest = Schema.Struct({ napi: Schema.optional(Napi) });

const Platforms = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ target: Schema.String, runner: Schema.String })),
);

const runnerOf = (target: string): Option.Option<string> =>
  pipe(
    RUNNERS,
    Arr.findFirst(({ marker }) => pipe(target, Str.includes(marker))),
    Option.map(({ runner }) => runner),
  );

const platforms = Effect.gen(function* platforms() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  const manifest = yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
  const targets = Option.match(Option.fromUndefinedOr(manifest.napi), {
    onNone: (): readonly string[] => [],
    onSome: ({ targets: declared }) => declared,
  });
  const found = pipe(
    targets,
    Arr.flatMap((target) =>
      pipe(
        runnerOf(target),
        Option.map((runner) => ({ target, runner })),
        Option.toArray,
      ),
    ),
  );
  const encoded = yield* Schema.encodeEffect(Platforms)(found);
  yield* writeOutputs({ platforms: encoded });
});

runMain("native-platforms")(platforms);
