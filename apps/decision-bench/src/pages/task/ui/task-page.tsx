import { getRouteApi, Navigate } from "@tanstack/react-router";
import { Array, Option } from "effect";
import type { ReactNode } from "react";

import { tasks } from "#/entities/benchmark";
import type { TaskInfo } from "#/entities/benchmark";
import { MethodLink } from "#/shared/ui/method-link";
import { PageShell } from "#/widgets/page-shell";

import { TaskBlock } from "./task-block";

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

const TaskPage = (): ReactNode => {
  const { task } = route.useParams();
  return Option.match(
    Array.findFirst(tasks, (candidate) => candidate.task === task),
    { onNone: () => <Navigate to="/" />, onSome: pageOf },
  );
};

export { TaskPage };
