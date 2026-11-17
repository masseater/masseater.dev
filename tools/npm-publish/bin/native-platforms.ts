import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, FileSystem, Option, Schema, String as Str, pipe } from "effect";

const RUNNERS = [
  { prefix: "linux-", runner: "ubuntu-latest" },
  { prefix: "win32-", runner: "windows-latest" },
  { prefix: "darwin-", runner: "macos-latest" },
] as const;

const Native = Schema.Struct({ targets: Schema.Array(Schema.String) });

const Manifest = Schema.Struct({ native: Schema.optional(Native) });

const Platforms = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ target: Schema.String, runner: Schema.String })),
);

const runnerOf = (target: string): Option.Option<string> =>
  pipe(
    RUNNERS,
    Arr.findFirst(({ prefix }) => pipe(target, Str.startsWith(prefix))),
    Option.map(({ runner }) => runner),
  );

const platforms = Effect.gen(function* platforms() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  const manifest = yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
  const targets = Option.match(Option.fromUndefinedOr(manifest.native), {
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
