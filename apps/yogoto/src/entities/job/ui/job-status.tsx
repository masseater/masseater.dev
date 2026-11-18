import type { Job } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { JOB_FAILURES, JOB_STAGES, JOB_STATES } from "#/shared/config/index.ts";
import { percent } from "#/shared/lib/index.ts";

import { JobMeter } from "./job-meter.tsx";

const labelOf = (job: Job): string => {
  if (job.state === "failed") {
    return JOB_FAILURES[job.message] ?? JOB_STATES.failed;
  }
  if (job.state !== "running") {
    return JOB_STATES[job.state];
  }
  const stage = JOB_STAGES[job.message] ?? JOB_STATES.running;
  return `${stage} ${percent(job.progress)}`;
};

export const JobStatus = ({ job }: Readonly<{ job: Job }>): ReactNode => (
  <span
    className="text-muted-foreground grid shrink-0 gap-1 text-right text-xs"
    title={job.message}
  >
    {labelOf(job)}
    <JobMeter job={job} />
  </span>
);
