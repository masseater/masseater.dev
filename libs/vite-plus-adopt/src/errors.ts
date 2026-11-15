import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class VpToolsError extends taggedError<VpToolsError, { readonly brand: unique symbol }>()(
  "VpToolsError",
  {
    kind: Schema.Literals(["config-missing", "tool-failed", "checks-failed"]),
    message: Schema.String,
  },
) {}

export const configMissing = (message: string): VpToolsError =>
  VpToolsError.make({ kind: "config-missing", message });

export const checksFailed = (message: string): VpToolsError =>
  VpToolsError.make({ kind: "checks-failed", message });

export const toolFailed =
  (tool: string) =>
  (cause: unknown): VpToolsError =>
    VpToolsError.make({ kind: "tool-failed", message: `${tool} failed: ${String(cause)}` });
