import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class VpToolsError extends taggedError<VpToolsError, { readonly brand: unique symbol }>()(
  "VpToolsError",
  {
    kind: Schema.Literals(["config-missing", "tool-failed", "checks-failed"]),
    message: Schema.String,
  },
) {}

const configMissing = (message: string): VpToolsError =>
  VpToolsError.make({ kind: "config-missing", message });

const checksFailed = (message: string): VpToolsError =>
  VpToolsError.make({ kind: "checks-failed", message });

const toolFailed =
  (tool: string) =>
  (cause: unknown): VpToolsError =>
    VpToolsError.make({ kind: "tool-failed", message: `${tool} failed: ${String(cause)}` });

export { VpToolsError, checksFailed, configMissing, toolFailed };
