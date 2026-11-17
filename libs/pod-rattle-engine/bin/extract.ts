import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, Option, Schema, String as Str, pipe } from "effect";

const PAGE = "../../apps/labs/pages/pod-rattle/index.html";
const OUTPUT_DIR = "generated";
const OUTPUT = `${OUTPUT_DIR}/engine.js`;
const START = "function createEngine(";
const END = "\n      }\n";

const taggedError = Schema.TaggedError;

class EngineNotFound extends taggedError<EngineNotFound, { readonly brand: unique symbol }>()(
  "EngineNotFound",
  { page: Schema.String },
) {}

const extract = (html: string): Option.Option<string> =>
  pipe(
    Str.indexOf(START)(html),
    Option.map((start) => Str.slice(start)(html)),
    Option.flatMap((rest) =>
      pipe(
        Str.indexOf(END)(rest),
        Option.map((end) => Str.takeLeft(end + END.length)(rest)),
      ),
    ),
  );

const program = Effect.gen(function* extractEngine() {
  const fileSystem = yield* FileSystem.FileSystem;
  const html = yield* fileSystem.readFileString(PAGE);
  const engine = yield* pipe(
    extract(html),
    Effect.fromOption,
    Effect.mapError(() => EngineNotFound.make({ page: PAGE })),
  );
  yield* fileSystem.makeDirectory(OUTPUT_DIR, { recursive: true });
  yield* fileSystem.writeFileString(OUTPUT, `${engine}\nexport { createEngine };\n`);
});

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(
        program.pipe(Effect.withSpan("pod-rattle-engine.parity.extract")),
        context,
      ),
    ),
    Effect.scoped,
  ),
);
