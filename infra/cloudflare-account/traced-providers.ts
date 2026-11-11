import { providers, state } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";

import { TRACE_DESTINATION } from "./trace-destination.ts";

const tracedProviders = withWorkersTracing({ destinations: [TRACE_DESTINATION] });

/** @internal */
const tracedStackProps = { providers: tracedProviders(providers()), state: state() };

export { tracedStackProps };
