import { colorOf } from "#/pages/leaderboard/model/model-color";
import type { TaskEntry } from "#/pages/leaderboard/model/ranking";

export const taskEntryKey = ({ model }: TaskEntry): string => model.model;
export const taskEntryColor = ({ model }: TaskEntry): string => colorOf(model.model);
