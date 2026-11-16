import { mergeResponses, snippetRequestsFor } from "#/entities/decision/index.ts";
import { endpointOf, sendWorkersAi, serveDecisions } from "#/features/serve-decisions/index.ts";

serveDecisions({
  endpoint: endpointOf,
  wires: snippetRequestsFor,
  combine: mergeResponses,
  send: sendWorkersAi,
});
