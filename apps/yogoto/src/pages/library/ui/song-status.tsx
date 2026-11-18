import type { Job, Song } from "@masseater.dev/yogoto-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import { JobStatus, latestJobOf, useJobs } from "#/entities/job/index.ts";

const nothing = (): ReactNode => false;

const status = (job: Job): ReactNode => <JobStatus job={job} />;

export const SongStatus = ({ song }: Readonly<{ song: Song }>): ReactNode => {
  const jobs = useJobs();
  return Option.match(latestJobOf(song.id)(jobs), { onNone: nothing, onSome: status });
};
