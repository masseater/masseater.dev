import { Effect } from "effect";

import { listSources, revertSource } from "#entities/source";
import { ingestText } from "#features/ingest";

import type { Handlers } from "./handler-types.ts";
import { McpEndpoint } from "./mcp-endpoint.ts";
import { failed } from "./request-failed.ts";

const listed = Effect.fn("listed")(function* listed() {
  const sources = yield* failed(listSources());
  return { sources };
});

const ingested = Effect.fn("ingested")(function* ingested({ text }: { readonly text: string }) {
  return yield* failed(ingestText(text));
});

const reverted = Effect.fn("reverted")(function* reverted({ id }: { readonly id: string }) {
  yield* failed(revertSource(id));
});

const mcp = Effect.fn("mcp")(function* mcp() {
  return yield* McpEndpoint;
});

/** @internal */
const sourceHandlers = {
  ListSources: listed,
  IngestText: ingested,
  RevertSource: reverted,
  GetMcp: mcp,
} satisfies Pick<Handlers, "ListSources" | "IngestText" | "RevertSource" | "GetMcp">;

export { sourceHandlers };
