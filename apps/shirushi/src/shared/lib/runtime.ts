import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

/** @internal */
export const runtime = Atom.runtime(FetchHttpClient.layer);
