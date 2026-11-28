import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Effect } from "effect";
import type { Scope } from "effect";

import { outcomeOfError } from "#/features/probe-tools/model/outcome.ts";
import type { Outcome } from "#/features/probe-tools/model/outcome.ts";

const MCP_PATH = "/mcp";

export type Endpoint = Readonly<{ host: string; token: string }>;

const connecting = (endpoint: Endpoint): Promise<Client> => {
  const client = new Client({ name: "monkey-test", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`https://${endpoint.host}${MCP_PATH}`),
    { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } },
  );
  return client.connect(transport).then(() => client);
};

const connected = (endpoint: Endpoint): Effect.Effect<Client, Outcome, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.tryPromise({ try: () => connecting(endpoint), catch: outcomeOfError }),
    (client) => Effect.promise(() => client.close()),
  );

/** @internal */
export const connectMcp = connected;
