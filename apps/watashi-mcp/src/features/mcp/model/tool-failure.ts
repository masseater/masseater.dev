import type { MemoryExists } from "./memory-exists";
import type { MemoryNotFound } from "./memory-not-found";
import type { RevisionNotFound } from "./revision-not-found";
import type { StorageFailed } from "./storage-failed";
import type { TodoNotFound } from "./todo-not-found";
import type { UpstreamFailed } from "./upstream-failed";

type ToolFailure =
  | MemoryExists
  | MemoryNotFound
  | TodoNotFound
  | RevisionNotFound
  | StorageFailed
  | UpstreamFailed;

type RestoreFailure = Exclude<ToolFailure, MemoryExists | UpstreamFailed>;

export type { RestoreFailure, ToolFailure };
