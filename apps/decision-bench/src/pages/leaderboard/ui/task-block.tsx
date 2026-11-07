import type { ReactNode } from "react";

import type { TaskInfo } from "#/pages/leaderboard/model/ranking";
import { useVisibleEntries } from "#/pages/leaderboard/model/view";

import { TaskCharts } from "./charts/task-charts";
import { NoteList } from "./note-list";
import { ReliabilitySection } from "./reliability-section";
import { ProfileTable } from "./tables/profile-table";
import { ScoreTable } from "./tables/score-table";
import { notesOf } from "./task-notes";

const TaskBlock = ({ task }: Readonly<{ task: TaskInfo }>): ReactNode => {
  const entries = useVisibleEntries(task.task);
  return (
    <>
      <NoteList notes={notesOf(task)} />
      <ScoreTable task={task} entries={entries} />
      <ProfileTable task={task} entries={entries} />
      <TaskCharts entries={entries} />
      <ReliabilitySection task={task.task} entries={entries} />
    </>
  );
};

export { TaskBlock };
