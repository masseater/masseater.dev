import { colorOf } from "#/pages/leaderboard/model/model-color";
import type { TaskEntry } from "#/pages/leaderboard/model/ranking";

const taskEntryKey = ({ model }: TaskEntry): string => model.model;
const taskEntryColor = ({ model }: TaskEntry): string => colorOf(model.model);

export { taskEntryColor, taskEntryKey };
