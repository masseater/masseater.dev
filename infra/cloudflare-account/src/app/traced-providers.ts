import { Layer } from "effect";

import { tracedStackProps as traced } from "#/features/trace-stacks/index.ts";
import { copyObjectsProvider } from "#/shared/api/index.ts";

/** @internal */
export const tracedStackProps = {
  providers: copyObjectsProvider.pipe(Layer.provideMerge(traced.providers)),
  state: traced.state,
};
