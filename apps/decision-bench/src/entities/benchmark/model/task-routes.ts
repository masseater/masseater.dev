import { Array as Arr, pipe } from "effect";

import { tasks } from "./ranking";
import type { TaskInfo } from "./ranking";

export type TaskRoute = Readonly<{ info: TaskInfo; params: Readonly<{ task: string }> }>;

export const taskRoutes: readonly TaskRoute[] = pipe(
  tasks,
  Arr.map((info) => ({
    info,
    params: { task: info.task },
  })),
);
