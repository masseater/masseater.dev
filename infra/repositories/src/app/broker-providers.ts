import { providers } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Layer } from "effect";

import { copyRowsProvider } from "#/features/relocate-database/index.ts";
import { TRACE_DESTINATION } from "#/shared/config/index.ts";

const traced = withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers());

/** @internal */
export const brokerProviders = copyRowsProvider.pipe(Layer.provideMerge(traced));
