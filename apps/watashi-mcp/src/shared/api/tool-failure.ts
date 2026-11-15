import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";

import type { RevisionNotFound, StorageFailed } from "#/shared/db";

import type { InvalidRecord } from "./invalid-record";
import type { MemoryNotFound } from "./memory-not-found";
import type { RecordNotFound } from "./record-not-found";

export type ToolFailure =
  | InvalidRecord
  | MemoryNotFound
  | RecordNotFound
  | RevisionNotFound
  | StorageFailed
  | UpstreamFailed;

export type StoreFailure = Exclude<ToolFailure, UpstreamFailed>;
