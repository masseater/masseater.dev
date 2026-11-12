import { layerDigest } from "@effect/platform-node-shared/NodeCrypto";
import { layer as fileSystem } from "@effect/platform-node-shared/NodeFileSystem";
import { layer as path } from "@effect/platform-node-shared/NodePath";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "oxlint-plugin-decision" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const workerServices: [
  typeof fileSystem,
  typeof path,
  typeof layerDigest,
  typeof FetchHttpClient.layer,
  typeof tracing,
] = [fileSystem, path, layerDigest, FetchHttpClient.layer, tracing];

/** @internal */
export { workerServices };
