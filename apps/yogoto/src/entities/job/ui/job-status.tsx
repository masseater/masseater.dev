import type { Job, JobState } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { JOB_FAILURES, JOB_STAGES, JOB_STATES } from "#/shared/config/index.ts";
import { percent } from "#/shared/lib/index.ts";

import { JobMeter } from "./job-meter.tsx";

const MESSAGES: Readonly<Record<JobState, Readonly<Record<string, string>>>> = {
  queued: {},
  running: JOB_STAGES,
  done: {},
  failed: JOB_FAILURES,
};

const labelOf = (job: Job): string => {
  const label = MESSAGES[job.state][job.message] ?? JOB_STATES[job.state];
  if (job.state === "running") {
    return `${label} ${percent(job.progress)}`;
  }
  return label;
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
