import { NodeRuntime, NodeServices } from "@effect/platform-node";
import {
  AUTO,
  cutoffFor,
  DEFAULT_MODEL,
  PRODUCT_NAME,
  detect,
  openRouter,
  readDocument,
  readersWith,
  removeRegions,
} from "@r_masseater/injection-bisect";
import type { Detection } from "@r_masseater/injection-bisect";
import {
  Config,
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Schema,
  Array as Arr,
  String as Str,
  pipe,
} from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import type { PlatformError } from "effect/PlatformError";

import pkg from "#package.json" with { type: "json" };

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: PRODUCT_NAME },
}).pipe(Layer.provide(OtlpSerialization.layerJson));

const services = Layer.mergeAll(openRouter, tracing).pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provideMerge(NodeServices.layer),
);

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const encoder = new TextEncoder();

type Region = Extract<Detection, Readonly<{ regions: unknown }>>["regions"][number];

const withTextOf =
  (input: string) =>
  (region: Region): Region & Readonly<{ text: string }> => ({
    ...region,
    text: Str.slice(region.start, region.end)(input),
  });

const reportOf = (detection: Detection, input: string): unknown => {
  if (detection.status === "clean") {
    return detection;
  }
  return {
    ...detection,
    regions: pipe(detection.regions, Arr.map(withTextOf(input))),
    cleaned: removeRegions({ text: input, regions: detection.regions }),
  };
};

const bytesOf = (
  text: Option.Option<string>,
  file: Option.Option<string>,
): Effect.Effect<Uint8Array, PlatformError, FileSystem.FileSystem> =>
  Option.match(file, {
    onSome: (path) =>
      Effect.gen(function* read() {
        const fs = yield* FileSystem.FileSystem;
        return yield* fs.readFile(path);
      }),
    onNone: () => Effect.succeed(encoder.encode(Option.getOrElse(text, () => ""))),
  });

const cacheDirectory = Effect.gen(function* cache() {
  const home = yield* Config.String("XDG_CACHE_HOME").pipe(
    Config.orElse(() => Config.String("HOME").pipe(Config.map((path) => `${path}/.cache`))),
  );
  const directory = `${home}/${PRODUCT_NAME}`;
  const fs = yield* FileSystem.FileSystem;
  yield* fs.makeDirectory(directory, { recursive: true });
  return directory;
});

const command = Command.make(
  PRODUCT_NAME,
  {
    text: Argument.String("text").pipe(Argument.optional),
    file: Flag.String("file").pipe(Flag.optional),
    format: Flag.String("format").pipe(Flag.withDefault(AUTO)),
    model: Flag.String("model").pipe(Flag.withDefault(DEFAULT_MODEL)),
    cutoff: Flag.Finite("cutoff").pipe(Flag.optional),
  },
  ({ text, file, format, model, cutoff }) =>
    Effect.gen(function* inspect() {
      const input = yield* readDocument({
        bytes: yield* bytesOf(text, file),
        format,
        name: Option.getOrElse(file, () => ""),
        readers: readersWith({ worker: { cachePath: yield* cacheDirectory } }),
      });
      const detection = yield* detect(input.text, {
        model,
        format: input.format,
        cutoff: Option.getOrElse(cutoff, () => cutoffFor(model)),
      });
      const report = yield* encodeJson(reportOf(detection, input.text));
      yield* Console.log(report);
    }),
);

const program = Command.run(command, { version: pkg.version });

NodeRuntime.runMain(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
