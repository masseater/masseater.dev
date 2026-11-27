import { Layer } from "effect";

import { copyRowsProvider } from "#/features/relocate-database/index.ts";
import { tracedStackProps as traced } from "#/features/trace-stacks/index.ts";

/** @internal */
export const tracedStackProps = {
  providers: copyRowsProvider.pipe(Layer.provideMerge(traced.providers)),
  state: traced.state,
};
