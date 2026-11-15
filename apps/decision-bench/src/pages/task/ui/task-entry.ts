import { colorOf } from "#/entities/benchmark";
import type { TaskEntry } from "#/entities/benchmark";

const taskEntryKey = ({ model }: TaskEntry): string => model.model;
const taskEntryColor = ({ model }: TaskEntry): string => colorOf(model.model);

export { taskEntryColor, taskEntryKey };
