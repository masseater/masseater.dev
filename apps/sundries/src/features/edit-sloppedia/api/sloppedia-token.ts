import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect } from "effect";

import { brokerFailed, brokerResponse } from "#/shared/api/index.ts";

export type SloppediaBroker = Readonly<{ fetch: (url: string) => Promise<Response> }>;

const BROKER_URL = "https://credentials.masseater.dev/";

export const sloppediaToken = (broker: SloppediaBroker): Effect.Effect<string, UpstreamFailed> =>
  brokerResponse(() => broker.fetch(BROKER_URL)).pipe(
    Effect.flatMap((response) =>
      Effect.tryPromise({ try: () => response.text(), catch: brokerFailed }),
    ),
  );
