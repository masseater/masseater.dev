import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";

import type { InvalidRecord } from "./invalid-record";
import type { MemoryNotFound } from "./memory-not-found";
import type { RecordNotFound } from "./record-not-found";
import type { RevisionNotFound } from "./revision-not-found";
import type { StorageFailed } from "./storage-failed";

type ToolFailure =
  | InvalidRecord
  | MemoryNotFound
  | RecordNotFound
  | RevisionNotFound
  | StorageFailed
  | UpstreamFailed;

type StoreFailure = Exclude<ToolFailure, UpstreamFailed>;

export type { StoreFailure, ToolFailure };
