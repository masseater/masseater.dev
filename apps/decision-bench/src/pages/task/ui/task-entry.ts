import { colorOf } from "#/entities/benchmark";
import type { TaskEntry } from "#/entities/benchmark";

export const taskEntryKey = ({ model }: TaskEntry): string => model.model;
export const taskEntryColor = ({ model }: TaskEntry): string => colorOf(model.model);
