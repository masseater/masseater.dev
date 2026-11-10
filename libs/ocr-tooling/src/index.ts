import { Config, Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";

const CHROMIUM = "/opt/pw-browsers/chromium";

const executablePathOf: Effect.Effect<string> = Config.option(
  Config.NonEmptyString("CHROME_PATH"),
).pipe(
  Effect.map(Option.getOrElse(() => CHROMIUM)),
  Effect.orElseSucceed(() => CHROMIUM),
);

const launchBrowser: Effect.Effect<Browser, never, Scope.Scope> = Effect.acquireRelease(
  executablePathOf.pipe(
    Effect.flatMap((executablePath) => Effect.promise(() => chromium.launch({ executablePath }))),
  ),
  (opened) => Effect.promise(() => opened.close()),
);

const provideAtEntry =
  <Provided, LayerError>(layer: Layer.Layer<Provided, LayerError>) =>
  <Success, Failure>(
    program: Effect.Effect<Success, Failure, Provided | Scope.Scope>,
  ): Effect.Effect<Success, Failure | LayerError> =>
    Layer.build(layer).pipe(
      Effect.flatMap((context) => Effect.provideContext(program, context)),
      Effect.scoped,
    );

const tracingLayer = (serviceName: string): Layer.Layer<never> =>
  OtlpTracer.layerFromConfig({ resource: { serviceName } }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  );

export { launchBrowser, provideAtEntry, tracingLayer };
