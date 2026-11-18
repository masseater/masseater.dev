import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import { dailyCommand, saveCommand } from "#/app/daily-command.ts";
import { pruneCommand } from "#/features/prune-versions/index.ts";
import pkg from "#package.json" with { type: "json" };

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: pkg.name },
}).pipe(Layer.provide(OtlpSerialization.layerJson));

const services = tracing.pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(nodeServices),
  Layer.provideMerge(CredentialsFromEnv),
);

const command = Command.make("nimado-collect").pipe(
  Command.withSubcommands([dailyCommand, pruneCommand, saveCommand]),
);

runMain(
  Layer.build(services).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(Command.run(command, { version: pkg.version }), context),
    ),
    Effect.scoped,
  ),
);
