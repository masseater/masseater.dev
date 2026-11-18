import { createRemoteJWKSet } from "jose";

import { CI_TELEMETRY_AUDIENCE } from "./app-name.ts";
import { ISSUER, ciTelemetryWorker } from "./ci-telemetry-worker.ts";

export default ciTelemetryWorker({
  keys: createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`)),
  audience: CI_TELEMETRY_AUDIENCE,
});
