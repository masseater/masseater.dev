import { SecureRandom } from "effect/crypto";
import { Atom } from "effect/reactivity";

/** @internal */
export const runtime = Atom.runtime(SecureRandom.layerWebCrypto);
