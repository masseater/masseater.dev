import { getRouteApi, Navigate } from "@tanstack/react-router";
import { Array, Option } from "effect";
import type { ReactNode } from "react";

import { tasks } from "#/entities/benchmark/index.ts";
import type { TaskInfo } from "#/entities/benchmark/index.ts";
import { MethodLink } from "#/shared/ui/method-link.tsx";
import { PageShell } from "#/widgets/page-shell/index.ts";

import { TaskBlock } from "./task-block.tsx";

const route = getRouteApi("/tasks/$task");

const pageOf = (info: TaskInfo): ReactNode => (
  <PageShell
    header={
      <>
        <h1 className="text-2xl font-bold">{info.label}</h1>
        <MethodLink />
      </>
    }
  >
    <TaskBlock task={info} />
  </PageShell>
);

export const TaskPage = (): ReactNode => {
  const { task } = route.useParams();
  return Option.match(
    Array.findFirst(tasks, (candidate) => candidate.task === task),
    { onNone: () => <Navigate to="/" />, onSome: pageOf },
  );
};
