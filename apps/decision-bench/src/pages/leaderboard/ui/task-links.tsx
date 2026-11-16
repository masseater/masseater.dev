import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { notesOf, taskRoutes } from "#/entities/benchmark/index.ts";
import { NoteList } from "#/shared/ui/note-list.tsx";
import { Section } from "#/shared/ui/section.tsx";

export const TaskLinks = (): ReactNode => (
  <Section id="tasks" title="タスク">
    {pipe(
      taskRoutes,
      Arr.map(({ info, params }) => (
        <article key={info.task} className="flex flex-col gap-2">
          <Link to="/tasks/$task" params={params} className="text-primary font-medium underline">
            {info.label}
          </Link>
          <NoteList notes={notesOf(info)} />
        </article>
      )),
    )}
  </Section>
);
