import { OpenRouter } from "@openrouter/sdk";
import { Effect } from "effect";

import { openRouterApp } from "./openrouter-app.ts";
import type { AppServices } from "./openrouter-app.ts";

const TOOL = "oxlint-plugin-decision";

const attribution = openRouterApp(TOOL).pipe(Effect.cached, Effect.runSync);

const clientFor = (apiKey: string): Effect.Effect<OpenRouter, never, AppServices> =>
  attribution.pipe(Effect.map((app) => new OpenRouter({ apiKey, ...app })));

export { clientFor };
type ClientServices = AppServices;

export type { ClientServices };
