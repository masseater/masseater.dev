import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";

import type { RevisionNotFound, StorageFailed } from "#/shared/db/index.ts";

import type { InvalidRecord } from "./invalid-record.ts";
import type { MemoryNotFound } from "./memory-not-found.ts";
import type { RecordNotFound } from "./record-not-found.ts";

export type ToolFailure =
  | InvalidRecord
  | MemoryNotFound
  | RecordNotFound
  | RevisionNotFound
  | StorageFailed
  | UpstreamFailed;

export type StoreFailure = Exclude<ToolFailure, UpstreamFailed>;
