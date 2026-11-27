import { Layer } from "effect";

import { retiredCopyRowsProvider } from "#/features/relocate-database/index.ts";
import { tracedStackProps as traced } from "#/features/trace-stacks/index.ts";

/** @internal */
export const tracedStackProps = {
  providers: retiredCopyRowsProvider.pipe(Layer.provideMerge(traced.providers)),
  state: traced.state,
};
