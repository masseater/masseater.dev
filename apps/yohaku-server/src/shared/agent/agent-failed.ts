import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class AgentFailed extends taggedError<AgentFailed, { readonly brand: unique symbol }>()(
  "AgentFailed",
  { message: Schema.String },
) {}

const agentFailed = (cause: unknown): AgentFailed =>
  AgentFailed.make({ message: globalThis.String(cause) });

export { AgentFailed, agentFailed };
