#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Console,
  DateTime,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import {
  POINTER,
  SCALES,
  SEQUENCES,
  VIEWPORT,
  measureAll,
  tableOf,
} from "#/features/measure-zoom/index.ts";

const RUNS = 5;
const REPORT_DIRECTORY = "report/zoom";
const REPORT = "zoom.json";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "holons-measure-zoom" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const writeReport = Effect.fn("holons.zoom.report")(function* writeReport(
  reportDirectory: string,
  report: Readonly<Record<string, unknown>>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.makeDirectory(reportDirectory, { recursive: true });
  const now = yield* DateTime.now;
  const json = yield* encodeJson({ measuredAt: DateTime.formatIso(now), ...report });
  yield* fileSystem.writeFileString(path.join(reportDirectory, REPORT), json);
});

const command = Command.make(
  "measure-zoom",
  {
    url: Argument.String("url").pipe(Argument.withDescription("The holons page to zoom")),
    chromeFlags: Flag.String("chrome-flags").pipe(
      Flag.withDefault(""),
      Flag.withDescription("Space-separated flags passed to Chrome"),
    ),
  },
  ({ url, chromeFlags }) =>
    Effect.gen(function* measure() {
      const flags = pipe(chromeFlags, Str.split(" "), Arr.filter(Boolean));
      const { results, rows } = yield* measureAll({ url, chromeFlags: flags, runs: RUNS });
      yield* writeReport(REPORT_DIRECTORY, {
        url,
        viewport: VIEWPORT,
        pointer: POINTER,
        runs: RUNS,
        scales: SCALES,
        sequences: SEQUENCES,
        medians: rows,
        results,
      });
      yield* Console.log(tableOf(rows));
    }),
);

runMain(
  Layer.mergeAll(tracing, nodeServices).pipe(
    Layer.build,
    Effect.flatMap((context) =>
      Effect.provideContext(Command.run(command, { version: "0.0.0" }), context),
    ),
    Effect.scoped,
  ),
);
