import type { InvalidRecord } from "./invalid-record";
import type { MemoryNotFound } from "./memory-not-found";
import type { RecordNotFound } from "./record-not-found";
import type { RevisionNotFound } from "./revision-not-found";
import type { StorageFailed } from "./storage-failed";
import type { UpstreamFailed } from "./upstream-failed";

type ToolFailure =
  | InvalidRecord
  | MemoryNotFound
  | RecordNotFound
  | RevisionNotFound
  | StorageFailed
  | UpstreamFailed;

type StoreFailure = Exclude<ToolFailure, UpstreamFailed>;

export type { StoreFailure, ToolFailure };
