import type { Job } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

const WHOLE = 1;

export const JobMeter = ({ job }: Readonly<{ job: Job }>): ReactNode => {
  if (job.state !== "running") {
    return false;
  }
  return (
    <progress
      aria-label={job.label}
      className="accent-foreground h-1 w-24"
      max={WHOLE}
      value={job.progress}
    />
  );
};
