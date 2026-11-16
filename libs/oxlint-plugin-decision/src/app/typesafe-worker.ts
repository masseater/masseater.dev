import { fileRequestsFor } from "#/entities/decision/index.ts";
import {
  sendTypesafe,
  serveDecisions,
  typesafeEndpointOf,
} from "#/features/serve-decisions/index.ts";

serveDecisions({
  endpoint: typesafeEndpointOf,
  wires: fileRequestsFor,
  send: sendTypesafe,
});
