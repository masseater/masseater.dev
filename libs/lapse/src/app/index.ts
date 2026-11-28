import { Config, Effect } from "effect";
import type { Plugin } from "vite-plus";

import { configOf } from "./config.ts";

export { OTEL_ENV, withOtelEnv } from "./config.ts";

const endpoint = Config.option(Config.String("OTEL_EXPORTER_OTLP_ENDPOINT"));

export const lapse = (): Plugin => ({
  name: "lapse",
  config: () => Effect.runPromise(endpoint.pipe(Effect.map(configOf), Effect.orDie)),
});
