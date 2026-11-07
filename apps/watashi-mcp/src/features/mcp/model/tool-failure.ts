import type { MemoryExists } from "./memory-exists";
import type { MemoryNotFound } from "./memory-not-found";
import type { RevisionNotFound } from "./revision-not-found";
import type { StorageFailed } from "./storage-failed";
import type { TodoNotFound } from "./todo-not-found";

type ToolFailure = MemoryExists | MemoryNotFound | TodoNotFound | RevisionNotFound | StorageFailed;

type RestoreFailure = Exclude<ToolFailure, MemoryExists>;

export type { RestoreFailure, ToolFailure };
