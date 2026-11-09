import { CredentialsFromEnv } from "@distilled.cloud/cloudflare/Credentials";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import pkg from "#package.json" with { type: "json" };

import { catalogCommand, nicoCommand, youtubeCommand } from "./commands.ts";
import { pruneCommand } from "./prune.ts";
import { publishCommand } from "./publish-command.ts";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: pkg.name },
}).pipe(Layer.provide(OtlpSerialization.layerJson));

const services = tracing.pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(CredentialsFromEnv),
);

const command = Command.make("nimado-collect").pipe(
  Command.withSubcommands([
    catalogCommand,
    nicoCommand,
    youtubeCommand,
    publishCommand,
    pruneCommand,
  ]),
);

NodeRuntime.runMain(
  Layer.build(services).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(Command.run(command, { version: pkg.version }), context),
    ),
    Effect.scoped,
  ),
);
