import { Schema } from "effect";

const JSON_RPC_VERSION = Schema.Literal("2.0");

export const RpcRequest = Schema.Struct({
  jsonrpc: JSON_RPC_VERSION,
  id: Schema.Int,
  method: Schema.String,
  params: Schema.Unknown,
  traceId: Schema.String,
  spanId: Schema.String,
  sampled: Schema.Boolean,
}).annotate({ identifier: "RpcRequest" });

export const RpcCauseReason = Schema.Struct({
  _tag: Schema.Literals(["Fail", "Die", "Interrupt"]),
  error: Schema.optional(Schema.Unknown),
}).annotate({ identifier: "RpcCauseReason" });

export const RpcError = Schema.Struct({
  _tag: Schema.Literals(["Cause", "Defect"]),
  code: Schema.Int,
  message: Schema.String,
  data: Schema.optional(Schema.Unknown),
}).annotate({ identifier: "RpcError" });

export const RpcResponse = Schema.Struct({
  jsonrpc: JSON_RPC_VERSION,
  id: Schema.optional(Schema.Int),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(RpcError),
}).annotate({ identifier: "RpcResponse" });
