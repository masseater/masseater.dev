import type { Job } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { JobStatus } from "#/entities/job/index.ts";

export const PendingImport = ({ job }: Readonly<{ job: Job }>): ReactNode => (
  <li className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2">
    <span className="min-w-0 flex-1 truncate text-sm">{job.label}</span>
    <JobStatus job={job} />
  </li>
);
