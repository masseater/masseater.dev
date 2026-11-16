import { colorOf } from "#/entities/benchmark/index.ts";
import type { TaskEntry } from "#/entities/benchmark/index.ts";

export const taskEntryKey = ({ model }: TaskEntry): string => model.model;
export const taskEntryColor = ({ model }: TaskEntry): string => colorOf(model.model);
