import type { ReactNode } from "react";

import type { TaskInfo } from "#/entities/benchmark/index.ts";
import { TaskCharts, notesOf } from "#/entities/benchmark/index.ts";
import { useVisibleEntries } from "#/features/filter-models/index.ts";
import { NoteList } from "#/shared/ui/note-list.tsx";

import { ProfileTable } from "./profile-table";
import { ReliabilitySection } from "./reliability-section";
import { ScoreTable } from "./score-table";

export const TaskBlock = ({ task }: Readonly<{ task: TaskInfo }>): ReactNode => {
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
