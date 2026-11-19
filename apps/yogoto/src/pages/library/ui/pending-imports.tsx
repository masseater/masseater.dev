import type { Job } from "@masseater.dev/yogoto-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useJobs } from "#/entities/job/index.ts";

import { PendingImport } from "./pending-import.tsx";

const pending = (job: Job): boolean => job.kind === "import" && job.state !== "done";

export const PendingImports = (): ReactNode => {
  const jobs = useJobs();
  return (
    <ul className="flex flex-col gap-2" role="list">
      {pipe(
        jobs,
        Arr.filter(pending),
        Arr.map((job) => <PendingImport key={job.id} job={job} />),
      )}
    </ul>
  );
};
