import { Layer } from "effect";
import { SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { telemetry } from "#/pages/interview/lib/telemetry";

const runtime = Atom.runtime(
  Layer.mergeAll(FetchHttpClient.layer, SecureRandom.layerWebCrypto, telemetry),
);

/** @internal */
export { runtime };
